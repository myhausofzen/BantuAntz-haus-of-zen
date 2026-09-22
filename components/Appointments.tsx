import React, { useState } from 'react';
import { 
  Calendar, Clock, User, CheckCircle2, ShieldCheck, 
  Sparkles, ArrowRight, ArrowLeft, Download, Phone, 
  Mail, MessageSquare, Zap, HeartHandshake, ExternalLink,
  AlertCircle, Activity, RefreshCw, ShoppingBag, CreditCard, Lock, Smartphone
} from 'lucide-react';
import { BookingService, Practitioner, Appointment } from '../types';
import { BOOKING_SERVICES, PRACTITIONERS, AVAILABLE_TIME_SLOTS } from '../services/bookingData';
import { 
  createSquarePaymentLink, 
  runSquareTestPayment, 
  chargeSquareCard,
  checkSquareOrderStatus,
  notifySquareTransaction,
  formatE164Phone,
  SquareTestPaymentResult 
} from '../services/checkoutService';

interface AppointmentsProps {
  onNavigateToShop?: () => void;
}

export const Appointments: React.FC<AppointmentsProps> = ({ onNavigateToShop }) => {
  const [activeTab, setActiveTab] = useState<'book' | 'my-appointments'>('book');
  const [selectedService, setSelectedService] = useState<BookingService>(BOOKING_SERVICES[0]);
  const [selectedPractitioner, setSelectedPractitioner] = useState<Practitioner>(PRACTITIONERS[0]);
  
  // Date options (generate next 10 days starting tomorrow)
  const availableDates = React.useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 10; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, []);

  const [selectedDate, setSelectedDate] = useState<Date>(availableDates[0]);
  const [selectedTime, setSelectedTime] = useState<string>(AVAILABLE_TIME_SLOTS[1]);

  // Client Details
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [intentionNotes, setIntentionNotes] = useState('');

  // Payment method for deposit
  const [depositPaymentMethod, setDepositPaymentMethod] = useState<'card' | 'apple_pay' | 'cash_app' | 'pay_in_person'>('card');

  // Pending hosted checkout state for online payments (Card, Apple Pay, Cash App)
  const [pendingHostedBooking, setPendingHostedBooking] = useState<{
    orderId: string;
    paymentLinkUrl: string;
    depositAmount: number;
    method: string;
  } | null>(null);
  const [isVerifyingDeposit, setIsVerifyingDeposit] = useState(false);
  const [depositVerifyNotice, setDepositVerifyNotice] = useState<string | null>(null);

  // Booking step: 1: Service, 2: Practitioner & Schedule, 3: Intake & Payment, 4: Confirmed
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Appointment | null>(null);
  const [squareBookingError, setSquareBookingError] = useState<{
    message: string;
    isFailedOk: boolean;
    errorCode?: string;
    detail?: string;
  } | null>(null);

  // Quick live test payment state
  const [isTestingSquare, setIsTestingSquare] = useState(false);
  const [testBookingResult, setTestBookingResult] = useState<SquareTestPaymentResult | null>(null);

  // Local storage appointments
  const [savedAppointments, setSavedAppointments] = useState<Appointment[]>(() => {
    try {
      const stored = localStorage.getItem('haus_of_zen_appointments');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const handleSelectService = (srv: BookingService) => {
    setSelectedService(srv);
    const matchingPrac = PRACTITIONERS.find(p => srv.availablePractitioners.includes(p.id)) || PRACTITIONERS[0];
    setSelectedPractitioner(matchingPrac);
    setStep(2);
  };

  const finalizeBookingRecord = (details: {
    paymentMethod: string;
    paymentStatus: 'deposit_paid' | 'due_at_arrival';
    squareOrderId?: string;
    receiptUrl?: string;
    paymentLinkUrl?: string;
  }) => {
    const newApt: Appointment = {
      id: `HZ-APT-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      serviceId: selectedService.id,
      serviceTitle: selectedService.title,
      practitionerId: selectedPractitioner.id,
      practitionerName: selectedPractitioner.name,
      date: selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
      timeSlot: selectedTime,
      durationMinutes: selectedService.durationMinutes,
      price: selectedService.price,
      depositAmount: selectedService.depositAmount,
      clientName,
      clientEmail,
      clientPhone: clientPhone || '(Not provided)',
      intentionNotes,
      status: 'confirmed',
      paymentMethod: details.paymentMethod,
      paymentLinkUrl: details.paymentLinkUrl,
      squareOrderId: details.squareOrderId,
      paymentStatus: details.paymentStatus,
      receiptUrl: details.receiptUrl,
      createdAt: new Date().toISOString(),
      bookingConfirmationId: `bk_${Date.now()}`
    };

    const updated = [newApt, ...savedAppointments];
    setSavedAppointments(updated);
    try {
      localStorage.setItem('haus_of_zen_appointments', JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save booking', e);
    }

    setConfirmedBooking(newApt);
    setPendingHostedBooking(null);
    setIsProcessing(false);
    setStep(4);
  };

  const handleCompleteBooking = async () => {
    if (!clientName || !clientEmail) {
      alert('Please provide your name and email address for the consultation confirmation.');
      return;
    }

    setIsProcessing(true);
    setSquareBookingError(null);
    setDepositVerifyNotice(null);

    const depositCents = Math.round(selectedService.depositAmount * 100);
    const refId = `HZ-APT-DEP-${Date.now().toString().slice(-6)}`;
    const sanitizedPhone = formatE164Phone(clientPhone);

    // OPTION 1: Pay in person at arrival
    if (depositPaymentMethod === 'pay_in_person') {
      finalizeBookingRecord({
        paymentMethod: 'pay_in_person',
        paymentStatus: 'due_at_arrival'
      });
      return;
    }

    // OPTION 2: Secure Online Deposit (Card, Apple Pay, Cash App) via Square Hosted Checkout
    try {
      const squareRes = await createSquarePaymentLink({
        items: [{
          name: `${selectedService.title} - Sanctuary Deposit`,
          quantity: 1,
          price: selectedService.depositAmount
        }],
        customerEmail: clientEmail,
        customerName: clientName,
        customerPhone: sanitizedPhone,
        redirectUrl: typeof window !== 'undefined' ? window.location.origin : 'https://www.myhausofzen.com'
      });

      if (squareRes.success && squareRes.paymentLinkUrl) {
        setIsProcessing(false);
        setPendingHostedBooking({
          orderId: squareRes.orderId || refId,
          paymentLinkUrl: squareRes.paymentLinkUrl,
          depositAmount: selectedService.depositAmount,
          method: depositPaymentMethod
        });
        // Open Square checkout window
        try {
          window.open(squareRes.paymentLinkUrl, '_blank', 'noopener,noreferrer');
        } catch (e) {
          console.warn('Could not auto open popup', e);
        }
        return;
      }

      // Square link generation failed
      setIsProcessing(false);
      const errorMsg = squareRes.error || 'Square Live payment link could not be generated';
      await notifySquareTransaction({
        transactionType: 'appointment_deposit',
        status: 'FAILED_DECLINED',
        referenceId: refId,
        amountCents: depositCents,
        customerName: clientName,
        customerEmail: clientEmail,
        customerPhone: sanitizedPhone,
        errorCode: 'CHECKOUT_LINK_ERROR',
        errorDetail: errorMsg
      });

      setSquareBookingError({
        message: errorMsg,
        isFailedOk: true,
        errorCode: squareRes.rawErrors?.[0]?.code || 'SQUARE_LIVE_DECLINE',
        detail: squareRes.rawErrors?.[0]?.detail || errorMsg
      });
    } catch (err: any) {
      setIsProcessing(false);
      setSquareBookingError({
        message: err.message || 'Error connecting to Square Live servers',
        isFailedOk: true,
        errorCode: 'NETWORK_ERROR'
      });
    }
  };

  // Verify hosted Square deposit payment (Apple Pay / Cash App)
  const handleVerifyDepositPayment = async () => {
    if (!pendingHostedBooking) return;

    setIsVerifyingDeposit(true);
    setDepositVerifyNotice(null);

    const status = await checkSquareOrderStatus(pendingHostedBooking.orderId);
    setIsVerifyingDeposit(false);

    if (status.isPaid) {
      finalizeBookingRecord({
        paymentMethod: pendingHostedBooking.method,
        paymentStatus: 'deposit_paid',
        squareOrderId: pendingHostedBooking.orderId,
        paymentLinkUrl: pendingHostedBooking.paymentLinkUrl
      });
    } else {
      setDepositVerifyNotice(
        'Square has not yet received confirmation of this deposit payment. Please finish submitting payment in the Square window and click Verify again.'
      );
    }
  };

  const handleTestSquareLive = async () => {
    setIsTestingSquare(true);
    setTestBookingResult(null);
    const res = await runSquareTestPayment(Math.round(selectedService.depositAmount * 100));
    setTestBookingResult(res);
    setIsTestingSquare(false);
  };

  // Download .ics calendar event
  const downloadIcs = (apt: Appointment) => {
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Haus of Zen//Modern Apothecary Appointments//EN',
      'BEGIN:VEVENT',
      `SUMMARY:Haus of Zen: ${apt.serviceTitle}`,
      `DESCRIPTION:Consultation with ${apt.practitionerName} at Haus of Zen Modern Apothecary.\\nNotes: ${apt.intentionNotes || 'Holistic narrative alignment'}`,
      'LOCATION:Haus of Zen Sanctuary, 123 Serenity Blvd, Wellness District',
      `STATUS:CONFIRMED`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `haus-of-zen-appointment-${apt.id}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const [heroImgSrc, setHeroImgSrc] = useState<string>('/untitled_25.png');

  return (
    <div className="bg-stone-50 min-h-screen">
      
      {/* Visual Hero Header with untitled_25.png */}
      <div className="relative min-h-[50vh] md:min-h-[65vh] w-full overflow-hidden flex items-center justify-center pt-8 lg:pt-24 pb-16">
        <div className="absolute inset-0 z-0">
          <img 
            src={heroImgSrc}
            alt="Haus of Zen Sanctuary Lounge - A Return to Home"
            referrerPolicy="no-referrer"
            onError={() => {
              setHeroImgSrc('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=2000&q=85');
            }}
            className="w-full h-full object-cover object-center filter brightness-[0.88] scale-100 transition-all duration-1000"
          />
          {/* Gradients to blend into stone-50 background smoothly */}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-50 via-stone-900/60 to-stone-950/75"></div>
          <div className="absolute inset-0 bg-stone-950/20 backdrop-blur-[0.5px]"></div>
        </div>

        <div className="relative z-10 container mx-auto px-6 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 py-1.5 px-4 border border-stone-100/40 rounded-full text-[11px] tracking-[0.2em] uppercase backdrop-blur-md mb-5 text-amber-200 bg-stone-900/50">
            <HeartHandshake className="w-3.5 h-3.5 text-amber-300" />
            <span>A Return to Home • Sanctuary & Dispensary</span>
          </div>

          <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl text-white leading-tight mb-5 drop-shadow-md">
            Book an Appointment
          </h1>

          <p className="font-sans text-sm sm:text-base md:text-lg text-stone-200 mt-2 leading-relaxed font-light max-w-2xl mx-auto drop-shadow-sm">
            Step into our tranquil dispensary for one-on-one narrative herbalism, personalized womb wellness mapping, and somatic sound bath decompressions.
          </p>

          {/* Navigation tabs */}
          <div className="flex justify-center gap-3 mt-8">
            <button
              onClick={() => { setActiveTab('book'); setStep(1); }}
              className={`py-2 px-5 rounded-full text-xs font-sans font-semibold tracking-wider uppercase transition-all shadow-md ${
                activeTab === 'book'
                  ? 'bg-amber-400 text-stone-950 scale-105'
                  : 'bg-stone-900/80 text-white border border-stone-100/30 hover:bg-stone-900 backdrop-blur-sm'
              }`}
            >
              Book a New Session
            </button>
            <button
              onClick={() => setActiveTab('my-appointments')}
              className={`py-2 px-5 rounded-full text-xs font-sans font-semibold tracking-wider uppercase transition-all shadow-md ${
                activeTab === 'my-appointments'
                  ? 'bg-amber-400 text-stone-950 scale-105'
                  : 'bg-stone-900/80 text-white border border-stone-100/30 hover:bg-stone-900 backdrop-blur-sm'
              }`}
            >
              My Bookings ({savedAppointments.length})
            </button>
          </div>
        </div>
      </div>

      <div className="pb-32 container mx-auto max-w-5xl px-6 -mt-6 relative z-20">

        {activeTab === 'my-appointments' ? (
          /* MY APPOINTMENTS LIST */
          <div className="max-w-2xl mx-auto space-y-4">
            {savedAppointments.length === 0 ? (
              <div className="text-center py-16 bg-white border border-stone-200 rounded-2xl p-8">
                <Calendar className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                <h3 className="font-serif text-xl text-stone-800">No scheduled consultations yet</h3>
                <p className="text-xs text-stone-500 font-sans mt-1 mb-6">
                  Reserve your narrative herbalism or somatic sound bath session today.
                </p>
                <button
                  onClick={() => { setActiveTab('book'); setStep(1); }}
                  className="py-2.5 px-6 rounded-xl bg-stone-900 text-white font-sans text-xs tracking-wider uppercase font-medium"
                >
                  Explore Sessions
                </button>
              </div>
            ) : (
              savedAppointments.map((apt) => (
                <div key={apt.id} className="bg-white border border-stone-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-sans tracking-wider bg-emerald-100 text-emerald-800 font-semibold">
                        Confirmed
                      </span>
                      <span className="text-xs font-mono text-stone-400">ID: {apt.id}</span>
                    </div>
                    <h4 className="font-serif text-xl text-stone-900">{apt.serviceTitle}</h4>
                    <p className="text-xs text-stone-600 font-sans mt-0.5">
                      With <strong className="text-stone-900">{apt.practitionerName}</strong>
                    </p>
                    <div className="flex items-center gap-4 text-xs text-stone-500 font-sans mt-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-stone-400" />
                        {apt.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-stone-400" />
                        {apt.timeSlot} ({apt.durationMinutes} min)
                      </span>
                    </div>
                  </div>

                  <div className="flex md:flex-col gap-2 items-end">
                    <span className="text-xs font-serif font-semibold text-stone-900">
                      Fee: ${apt.price.toFixed(2)}
                    </span>
                    <button
                      onClick={() => downloadIcs(apt)}
                      className="py-1.5 px-3 rounded-lg border border-stone-200 hover:bg-stone-100 text-stone-700 font-sans text-[11px] flex items-center gap-1.5 transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      Add to Calendar (.ics)
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* BOOKING WIZARD */
          <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden max-w-4xl mx-auto">
            
            {/* Step Indicators */}
            <div className="border-b border-stone-200 px-6 py-4 flex items-center justify-between text-xs font-sans text-stone-500 bg-stone-50/70">
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step >= 1 ? 'bg-stone-900 text-white' : 'bg-stone-200 text-stone-500'
                }`}>1</span>
                <span className={step === 1 ? 'text-stone-900 font-semibold' : ''}>Service</span>
              </div>
              <span className="text-stone-300">→</span>
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step >= 2 ? 'bg-stone-900 text-white' : 'bg-stone-200 text-stone-500'
                }`}>2</span>
                <span className={step === 2 ? 'text-stone-900 font-semibold' : ''}>Schedule</span>
              </div>
              <span className="text-stone-300">→</span>
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step >= 3 ? 'bg-stone-900 text-white' : 'bg-stone-200 text-stone-500'
                }`}>3</span>
                <span className={step === 3 ? 'text-stone-900 font-semibold' : ''}>Intake & Pay</span>
              </div>
            </div>

            <div className="p-6 md:p-10">

              {/* STEP 1: Select Service */}
              {step === 1 && (
                <div>
                  <h2 className="font-serif text-2xl md:text-3xl text-stone-900 mb-2">
                    Select Your Apothecary Experience
                  </h2>
                  <p className="text-xs font-sans text-stone-500 mb-8">
                    Choose from clinical consultations, hands-on apothecary compounding, or somatic acoustic journeys.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {BOOKING_SERVICES.map((srv) => (
                      <div
                        key={srv.id}
                        onClick={() => handleSelectService(srv)}
                        className={`p-5 rounded-xl border cursor-pointer transition-all duration-200 flex flex-col justify-between hover:shadow-md ${
                          selectedService.id === srv.id
                            ? 'border-stone-900 bg-stone-50 ring-1 ring-stone-900'
                            : 'border-stone-200 hover:border-stone-400 bg-white'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-sans tracking-wider uppercase bg-stone-200 text-stone-800 font-semibold">
                              {srv.category}
                            </span>
                            <div className="text-right">
                              <span className="font-serif font-bold text-lg text-stone-900">
                                ${srv.price}
                              </span>
                              <span className="block text-[10px] text-stone-400 font-sans">
                                (${srv.depositAmount} deposit)
                              </span>
                            </div>
                          </div>

                          <h3 className="font-serif text-lg text-stone-900 leading-snug">
                            {srv.title}
                          </h3>
                          <p className="text-xs font-sans text-stone-500 mt-1 mb-3">
                            {srv.subtitle}
                          </p>
                          <p className="text-xs font-sans text-stone-600 leading-relaxed line-clamp-2">
                            {srv.description}
                          </p>
                        </div>

                        <div className="pt-4 mt-4 border-t border-stone-200/60 flex items-center justify-between text-xs font-sans text-stone-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {srv.durationMinutes} Minutes
                          </span>
                          <span className="font-medium text-stone-900 flex items-center gap-1 text-xs">
                            Select Session <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 2: Practitioner & Schedule */}
              {step === 2 && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <button
                      onClick={() => setStep(1)}
                      className="text-xs font-sans text-stone-500 hover:text-stone-900 flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Change Service
                    </button>
                    <span className="text-xs font-serif font-semibold text-stone-800">
                      {selectedService.title} ({selectedService.durationMinutes} min • ${selectedService.price})
                    </span>
                  </div>

                  <h2 className="font-serif text-2xl text-stone-900 mb-1">
                    Choose Practitioner & Time
                  </h2>
                  <p className="text-xs font-sans text-stone-500 mb-6">
                    Select your herbalist guide and reserve a dedicated quiet slot in our dispensary.
                  </p>

                  {/* Practitioner Selection */}
                  <div className="mb-8">
                    <label className="block text-xs font-sans font-medium uppercase tracking-wider text-stone-600 mb-2">
                      Apothecary Practitioner
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {PRACTITIONERS.map((prac) => (
                        <div
                          key={prac.id}
                          onClick={() => setSelectedPractitioner(prac)}
                          className={`p-3.5 rounded-2xl border cursor-pointer flex items-center gap-3.5 transition-all ${
                            selectedPractitioner.id === prac.id
                              ? 'border-stone-900 bg-amber-50/50 ring-1 ring-stone-900 shadow-sm'
                              : 'border-stone-200 hover:border-stone-400 bg-white'
                          }`}
                        >
                          {prac.avatar ? (
                            <img 
                              src={prac.avatar} 
                              alt={prac.name} 
                              className="w-14 h-14 rounded-full object-cover object-top border-2 border-amber-200/90 shadow-xs flex-shrink-0" 
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-amber-100/90 border border-amber-300/80 text-amber-900 flex items-center justify-center font-serif text-base font-semibold flex-shrink-0">
                              {prac.name.split(' ').map(n => n[0]).join('') || 'HZ'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="font-serif text-base text-stone-900 font-semibold truncate">{prac.name}</h4>
                            <p className="text-[11px] text-amber-900 font-sans font-medium truncate">{prac.title || 'Founder & Master Herbalist'}</p>
                            {prac.specialty && (
                              <p className="text-[10px] text-stone-500 font-sans truncate mt-0.5">{prac.specialty}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Date Selector */}
                  <div className="mb-8">
                    <label className="block text-xs font-sans font-medium uppercase tracking-wider text-stone-600 mb-2">
                      Select Date
                    </label>
                    <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
                      {availableDates.map((date, idx) => {
                        const isSelected = selectedDate.toDateString() === date.toDateString();
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setSelectedDate(date)}
                            className={`p-3 rounded-xl border text-center min-w-[76px] transition-all flex-shrink-0 ${
                              isSelected
                                ? 'border-stone-900 bg-stone-900 text-white shadow-md'
                                : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700'
                            }`}
                          >
                            <span className="block text-[10px] uppercase font-sans tracking-wider opacity-80">
                              {date.toLocaleDateString('en-US', { weekday: 'short' })}
                            </span>
                            <span className="block font-serif text-xl font-bold my-0.5">
                              {date.getDate()}
                            </span>
                            <span className="block text-[10px] font-sans opacity-80">
                              {date.toLocaleDateString('en-US', { month: 'short' })}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time Slot Selector */}
                  <div className="mb-8">
                    <label className="block text-xs font-sans font-medium uppercase tracking-wider text-stone-600 mb-2">
                      Available Time Slots
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                      {AVAILABLE_TIME_SLOTS.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setSelectedTime(slot)}
                          className={`py-2 px-3 rounded-xl border text-xs font-sans font-medium transition-all text-center ${
                            selectedTime === slot
                              ? 'bg-stone-900 text-white border-stone-900 shadow-sm'
                              : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-stone-200 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="py-3 px-8 rounded-xl bg-stone-900 text-white font-sans text-xs tracking-wider uppercase font-medium hover:bg-stone-800 transition-colors flex items-center gap-2"
                    >
                      <span>Proceed to Intake</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: Client Intake & Confirmation */}
              {step === 3 && (
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <button
                      onClick={() => setStep(2)}
                      className="text-xs font-sans text-stone-500 hover:text-stone-900 flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back to Schedule
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                    
                    {/* Form Left */}
                    <div className="md:col-span-7 space-y-4">
                      <h2 className="font-serif text-2xl text-stone-900">
                        Client Information & Wellness Narrative
                      </h2>
                      <p className="text-xs font-sans text-stone-500 mb-4">
                        Share what intentions you bring to the consultation.
                      </p>

                      <div>
                        <label className="block text-xs font-sans font-medium uppercase tracking-wider text-stone-600 mb-1.5">
                          Full Name *
                        </label>
                        <div className="relative">
                          <User className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            required
                            value={clientName}
                            onChange={(e) => setClientName(e.target.value)}
                            placeholder="Elena Rostova"
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-stone-900 focus:outline-none focus:border-stone-900 focus:bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-sans font-medium uppercase tracking-wider text-stone-600 mb-1.5">
                            Email Address *
                          </label>
                          <div className="relative">
                            <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="email"
                              required
                              value={clientEmail}
                              onChange={(e) => setClientEmail(e.target.value)}
                              placeholder="elena@narrative.com"
                              className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-stone-900 focus:outline-none focus:border-stone-900 focus:bg-white"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-sans font-medium uppercase tracking-wider text-stone-600 mb-1.5">
                            Phone Number
                          </label>
                          <div className="relative">
                            <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="tel"
                              value={clientPhone}
                              onChange={(e) => setClientPhone(e.target.value)}
                              placeholder="(555) 019-2831"
                              className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-stone-900 focus:outline-none focus:border-stone-900 focus:bg-white"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-sans font-medium uppercase tracking-wider text-stone-600 mb-1.5">
                          Health Narrative & Current Sensations (Optional)
                        </label>
                        <div className="relative">
                          <MessageSquare className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                          <textarea
                            rows={3}
                            value={intentionNotes}
                            onChange={(e) => setIntentionNotes(e.target.value)}
                            placeholder="e.g. Dealing with chronic screen fatigue, restless sleep cycles, and seeking nervous system grounding..."
                            className="w-full bg-stone-50 border border-stone-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-stone-900 focus:outline-none focus:border-stone-900 focus:bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Summary & Deposit Payment Right */}
                    <div className="md:col-span-5 bg-stone-50 border border-stone-200 rounded-2xl p-6 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-sans tracking-widest uppercase text-stone-400 font-semibold block mb-1">
                          Booking Summary
                        </span>
                        <h4 className="font-serif text-lg text-stone-900 leading-snug">
                          {selectedService.title}
                        </h4>
                        <div className="flex items-center gap-2.5 mt-2">
                          {selectedPractitioner.avatar ? (
                            <img 
                              src={selectedPractitioner.avatar} 
                              alt={selectedPractitioner.name} 
                              className="w-9 h-9 rounded-full object-cover object-top border border-amber-300 shadow-xs flex-shrink-0"
                            />
                          ) : null}
                          <div>
                            <p className="text-xs font-semibold text-stone-900 font-sans">
                              {selectedPractitioner.name}
                            </p>
                            <p className="text-[10px] text-amber-900 font-sans">
                              {selectedPractitioner.title || 'Founder & Master Herbalist'}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-stone-200 space-y-2 text-xs font-sans text-stone-600">
                          <div className="flex justify-between">
                            <span>Date:</span>
                            <span className="font-semibold text-stone-900">
                              {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Time:</span>
                            <span className="font-semibold text-stone-900">
                              {selectedTime} ({selectedService.durationMinutes} min)
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Full Session Value:</span>
                            <span className="text-stone-700">${selectedService.price.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between pt-2 border-t border-stone-200 text-stone-900 font-bold">
                            <span>Deposit Due Today:</span>
                            <span className="font-serif text-lg text-stone-900">
                              ${selectedService.depositAmount.toFixed(2)}
                            </span>
                          </div>
                          <p className="text-[10px] text-stone-400 mt-1">
                            Remaining balance of ${(selectedService.price - selectedService.depositAmount).toFixed(2)} payable at appointment time.
                          </p>
                        </div>
                      </div>

                      {/* Pending Square Hosted Booking View */}
                      {pendingHostedBooking ? (
                        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3 animate-fade-in">
                          <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                            <Activity className="w-4 h-4 text-amber-600 animate-spin" />
                            <span>Square Hosted Payment Opened</span>
                          </div>
                          <p className="text-xs text-stone-600 leading-relaxed">
                            A Square payment window was opened to complete your ${pendingHostedBooking.depositAmount.toFixed(2)} deposit.
                            Please complete payment in Square, then click verify below. Your appointment will only be confirmed once accepted by Square.
                          </p>
                          {depositVerifyNotice && (
                            <div className="p-2.5 bg-amber-100 border border-amber-300 rounded-lg text-xs text-amber-900 font-medium">
                              {depositVerifyNotice}
                            </div>
                          )}
                          <div className="flex flex-col gap-2 pt-1">
                            <a
                              href={pendingHostedBooking.paymentLinkUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full py-2.5 px-3 rounded-lg bg-stone-900 text-white font-sans text-xs font-semibold text-center hover:bg-stone-800 transition-colors flex items-center justify-center gap-1.5"
                            >
                              <span>Re-open Square Checkout Window</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <button
                              type="button"
                              disabled={isVerifyingDeposit}
                              onClick={handleVerifyDepositPayment}
                              className="w-full py-2.5 px-3 rounded-lg bg-emerald-600 text-white font-sans text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>{isVerifyingDeposit ? 'Checking with Square...' : 'I Have Paid Deposit (Verify & Confirm Booking)'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingHostedBooking(null)}
                              className="w-full py-2 text-stone-500 hover:text-stone-800 text-[11px] font-sans text-center underline"
                            >
                              Change Payment Method
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Payment Method Selector for Deposit */}
                          <div className="mt-4 pt-3 border-t border-stone-200">
                            <span className="text-[10px] font-sans tracking-widest uppercase text-stone-400 font-semibold block mb-2">
                              Select Payment Option for Deposit
                            </span>
                            <div className="grid grid-cols-2 gap-2 mb-3">
                              <button
                                type="button"
                                onClick={() => { setDepositPaymentMethod('card'); setSquareBookingError(null); }}
                                className={`py-2 px-2.5 rounded-lg border text-xs font-sans font-medium flex items-center justify-center gap-1.5 transition-all ${
                                  depositPaymentMethod === 'card'
                                    ? 'border-stone-900 bg-stone-900 text-white'
                                    : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-100'
                                }`}
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Credit/Debit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => { setDepositPaymentMethod('apple_pay'); setSquareBookingError(null); }}
                                className={`py-2 px-2.5 rounded-lg border text-xs font-sans font-medium flex items-center justify-center gap-1.5 transition-all ${
                                  depositPaymentMethod === 'apple_pay'
                                    ? 'border-stone-900 bg-stone-900 text-white'
                                    : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-100'
                                }`}
                              >
                                <Smartphone className="w-3.5 h-3.5" />
                                <span>Apple Pay</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => { setDepositPaymentMethod('cash_app'); setSquareBookingError(null); }}
                                className={`py-2 px-2.5 rounded-lg border text-xs font-sans font-medium flex items-center justify-center gap-1.5 transition-all ${
                                  depositPaymentMethod === 'cash_app'
                                    ? 'border-stone-900 bg-stone-900 text-white'
                                    : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-100'
                                }`}
                              >
                                <Zap className="w-3.5 h-3.5" />
                                <span>Cash App Pay</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => { setDepositPaymentMethod('pay_in_person'); setSquareBookingError(null); }}
                                className={`py-2 px-2.5 rounded-lg border text-xs font-sans font-medium flex items-center justify-center gap-1.5 transition-all ${
                                  depositPaymentMethod === 'pay_in_person'
                                    ? 'border-stone-900 bg-stone-900 text-white'
                                    : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-100'
                                }`}
                              >
                                <span>Pay at Arrival</span>
                              </button>
                            </div>

                            {/* Secure Square Hosted Checkout Note */}
                            {depositPaymentMethod !== 'pay_in_person' && (
                              <div className="p-3 bg-stone-100/70 border border-stone-200 rounded-xl text-xs text-stone-600 space-y-1.5 mb-3">
                                <div className="flex items-center gap-1.5 font-bold text-stone-800 text-[11px]">
                                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                  <span>Square Secure Hosted Checkout</span>
                                </div>
                                <p className="text-[11px] leading-snug">
                                  You will be redirected to Square to securely authorize your ${selectedService.depositAmount.toFixed(2)} deposit with {depositPaymentMethod === 'apple_pay' ? 'Apple Pay' : depositPaymentMethod === 'cash_app' ? 'Cash App Pay' : 'Credit/Debit Card'}. Haus of Zen never handles or stores your payment details.
                                </p>
                                <div className="flex items-center gap-1.5 text-[10px] text-stone-500 pt-0.5">
                                  <Lock className="w-3 h-3 text-stone-400" />
                                  <span>256-Bit Square Live Encryption • PCI-DSS Level 1 Compliant</span>
                                </div>
                              </div>
                            )}

                            {depositPaymentMethod === 'pay_in_person' && (
                              <div className="p-3 bg-stone-100/70 border border-stone-200 rounded-xl text-xs text-stone-600 space-y-1 mb-3">
                                <p className="text-[11px] leading-snug">
                                  Your appointment will be reserved today, and your ${selectedService.depositAmount.toFixed(2)} deposit will be payable upon arrival at the sanctuary.
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Square Live Gateway Error / Failed OK notification */}
                          {squareBookingError && (
                            <div className="mt-2 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs font-sans text-amber-950 space-y-2 animate-fade-in">
                              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                                <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0" />
                                <span>Payment Declined by Square Live</span>
                              </div>
                              <p className="text-[11px] text-amber-800 leading-tight">
                                {squareBookingError.message}
                              </p>
                              <div className="text-[10px] text-stone-500 font-mono">
                                Gateway: connect.squareup.com • Order not booked
                              </div>
                            </div>
                          )}

                          {/* Action Button */}
                          <div className="mt-4 pt-2 border-t border-stone-200">
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={handleCompleteBooking}
                              className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-sans text-xs tracking-wider uppercase font-bold transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                            >
                              <Zap className="w-4 h-4 fill-stone-950 text-stone-950" />
                              <span>
                                {isProcessing
                                  ? 'Processing Square Payment...'
                                  : depositPaymentMethod === 'pay_in_person'
                                  ? 'Confirm & Pay Deposit at Arrival'
                                  : `Pay $${selectedService.depositAmount.toFixed(2)} Deposit & Book`}
                              </span>
                            </button>
                          </div>
                        </>
                      )}

                    </div>

                  </div>
                </div>
              )}

              {/* STEP 4: Confirmed Receipt */}
              {step === 4 && confirmedBooking && (
                <div className="text-center py-6 max-w-lg mx-auto">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <span className="text-[10px] font-sans tracking-widest uppercase text-emerald-700 font-semibold">
                    Appointment Confirmed
                  </span>
                  <h2 className="font-serif text-3xl text-stone-900 mt-1 mb-2">
                    We look forward to welcoming you.
                  </h2>
                  <p className="text-xs text-stone-600 font-sans leading-relaxed mb-6">
                    A confirmation and preparation guide has been dispatched to <strong className="text-stone-900">{confirmedBooking.clientEmail}</strong>.
                  </p>

                  <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 text-left text-xs font-sans space-y-2 mb-6">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Booking Reference:</span>
                      <span className="font-mono text-stone-900 font-semibold">{confirmedBooking.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Service:</span>
                      <span className="text-stone-900 font-medium">{confirmedBooking.serviceTitle}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Practitioner:</span>
                      <span className="text-stone-900 font-medium">{confirmedBooking.practitionerName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Date & Time:</span>
                      <span className="text-stone-900 font-semibold">{confirmedBooking.date} at {confirmedBooking.timeSlot}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Payment Status:</span>
                      <span className="text-emerald-700 font-semibold">
                        {confirmedBooking.paymentStatus === 'deposit_paid' 
                          ? `$${confirmedBooking.depositAmount.toFixed(2)} (Deposit Paid via Square)`
                          : `$${confirmedBooking.depositAmount.toFixed(2)} (Deposit Payable at Arrival)`}
                      </span>
                    </div>
                    {confirmedBooking.squareOrderId && (
                      <div className="flex justify-between">
                        <span className="text-stone-500">Square Order Ref:</span>
                        <span className="font-mono text-stone-800">{confirmedBooking.squareOrderId}</span>
                      </div>
                    )}
                  </div>

                  {(confirmedBooking.receiptUrl || confirmedBooking.paymentLinkUrl) && (
                    <a
                      href={confirmedBooking.receiptUrl || confirmedBooking.paymentLinkUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-3 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-sans text-xs tracking-wider uppercase font-bold transition-all flex items-center justify-center gap-2 mb-3 shadow-md"
                    >
                      <span>View Official Square Live Receipt</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={() => downloadIcs(confirmedBooking)}
                      className="py-2.5 px-5 rounded-xl bg-stone-900 text-white font-sans text-xs tracking-wider uppercase font-medium hover:bg-stone-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      Add to Calendar (.ics)
                    </button>
                    <button
                      onClick={() => { setActiveTab('my-appointments'); }}
                      className="py-2.5 px-5 rounded-xl bg-white border border-stone-200 text-stone-700 font-sans text-xs tracking-wider uppercase font-medium hover:bg-stone-100 transition-colors cursor-pointer"
                    >
                      View All Bookings
                    </button>
                    {onNavigateToShop && (
                      <button
                        onClick={onNavigateToShop}
                        className="py-2.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-stone-950 font-sans text-xs tracking-wider uppercase font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>Keep Shopping</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </div>
    </div>
  );
};