import { BookingService, Practitioner } from '../types';

export const PRACTITIONERS: Practitioner[] = [
  {
    id: 'practitioner_Nicole',
    name: 'Nicole Little',
    title: 'Founder & Master Herbalist',
    bio: 'Dedicated practitioner specializing in holistic womb wellness, restorative herbal tonics, and intuitive constitutional health.',
    specialty: 'Womb Health & Botanical Medicine',
    avatar: '/untitled_42.png'
  },
];

export const BOOKING_SERVICES: BookingService[] = [
  {
    id: 'srv_herbal_consultation_30',
    title: 'Herbal Consultation - 30 Mins',
    subtitle: 'Targeted Holistic Health & Hormonal Mapping',
    description: 'A focused, 30-minute one-on-one clinical herbalism consultation exploring your current health goals, hormonal balance, lifestyle rhythms, and bespoke botanical recommendations.',
    durationMinutes: 30,
    price: 49.99,
    depositAmount: 20.00,
    category: 'Consultation',
    availablePractitioners: ['practitioner_Nicole'],
    image: 'https://items-images-production.s3.us-west-2.amazonaws.com/files/5153dd84693a4698719f6bc71e20ea1133fcbb96/original.jpeg',
    benefits: [
      'Targeted 1-on-1 health and lifestyle review',
      'Tongue and constitutional evaluation',
      'Custom botanical formulation roadmap',
      'Follow-up guidance notes'
    ]
  },
  {
    id: 'srv_herbal_consultation_60',
    title: 'Herbal Consultation - 60 mins',
    subtitle: 'Comprehensive Holistic Health & Hormonal Mapping',
    description: 'An in-depth, 60-minute one-on-one clinical herbalism consultation thoroughly evaluating your health history, hormonal cycle, lifestyle patterns, and bespoke botanical formulations.',
    durationMinutes: 60,
    price: 59.99,
    depositAmount: 25.00,
    category: 'Consultation',
    availablePractitioners: ['practitioner_Nicole'],
    image: 'https://items-images-production.s3.us-west-2.amazonaws.com/files/5153dd84693a4698719f6bc71e20ea1133fcbb96/original.jpeg',
    benefits: [
      'Comprehensive 1-on-1 health narrative review',
      'Tongue, pulse and constitutional assessment',
      'In-depth bespoke botanical formulation plan',
      'Written protocol and follow-up guidance'
    ]
  },
  {
    id: 'srv_quick_audit',
    title: 'The Quick Audit',
    subtitle: '30-Minute Targeted Symptom Check & Custom Selection',
    description: 'Not sure where to begin? This focused session helps you identify the right tea and herbal support for your body right now, based on your current symptoms and goals. Includes $20 apothecary item credit.',
    durationMinutes: 30,
    price: 75.00,
    depositAmount: 25.00,
    category: 'Consultation',
    availablePractitioners: ['practitioner_Nicole'],
    image: 'https://items-images-production.s3.us-west-2.amazonaws.com/files/0eb2eb56c73174e1ca9abff8890c49c60ac3fd1f/original.png',
    benefits: [
      'Personalized symptom check-in',
      'Targeted tea & product recommendations',
      'Complimentary $20 apothecary credit included',
      'Virtual session with recording link'
    ]
  },
  {
    id: 'srv_deep_dive_17',
    title: 'The Deep Dive',
    subtitle: 'Comprehensive 1-on-1 Hormonal & Lifestyle Herbal Review',
    description: 'A comprehensive, one-on-one consultation exploring your hormonal patterns, lifestyle rhythms, and nutritional needs to create a truly personalized herbal protocol delivered as a PDF with 10% off apothecary items.',
    durationMinutes: 60,
    price: 120.00,
    depositAmount: 40.00,
    category: 'Consultation',
    availablePractitioners: ['practitioner_Nicole'],
    image: 'https://items-images-production.s3.us-west-2.amazonaws.com/files/5153dd84693a4698719f6bc71e20ea1133fcbb96/original.jpeg',
    benefits: [
      'In-depth comprehensive health and lifestyle review',
      'Custom herbal protocol delivered as a PDF',
      '10% off apothecary purchases',
      'Email follow-up support for 30 days'
    ]
  },
  {
    id: 'srv_narrative_herbalism',
    title: 'Narrative Herbalism & Bodily Mapping',
    subtitle: 'Comprehensive 1-on-1 Clinical Consultation',
    description: 'An in-depth inquiry into your health narrative, examining stress patterns, sleep cycles, digestion, and emotional equilibrium. Concludes with a personalized herbal prescription and custom tea/tincture formulation.',
    durationMinutes: 45,
    price: 85.00,
    depositAmount: 25.00,
    category: 'Consultation',
    availablePractitioners: ['practitioner_Nicole'],
    image: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80',
    benefits: [
      'Comprehensive holistic health narrative review',
      'Personalized botanical formulation roadmap',
      'Custom apothecary tincture crafted specifically for you',
      'Digital intake and 2-week follow-up check-in'
    ]
  },
  {
    id: 'srv_custom_blending',
    title: 'Apothecary Lab: Custom Tincture Blending',
    subtitle: 'Interactive Hands-On Formulation Experience',
    description: 'Work side-by-side with our alchemists in the physical or virtual dispensary. Test botanical aromatics, select rare adaptogens, and compound your own bespoke 100ml amber bottle tincture to take home.',
    durationMinutes: 60,
    price: 120.00,
    depositAmount: 35.00,
    category: 'Alchemy',
    availablePractitioners: ['practitioner_Nicole'],
    image: 'https://images.unsplash.com/photo-1512069772995-ec65ed45afd6?auto=format&fit=crop&w=800&q=80',
    benefits: [
      'Guided tasting and aroma evaluation of 20+ rare botanical extracts',
      'Personalized compounding worksheet',
      'Full 100ml bespoke botanical tincture formulated on the spot',
      'Custom engraved label with your intention'
    ]
  },
  {
    id: 'srv_somatic_breathwork',
    title: 'Somatic Breath & Resonant Sound Bath',
    subtitle: 'Polyvagal Decompression & Tibetan Singing Bowls',
    description: 'A deeply restorative private acoustic journey using hand-hammered bronze Tibetan singing bowls, gongs, and diaphragmatic polyvagal breath pacing to guide brainwaves into theta relaxation.',
    durationMinutes: 75,
    price: 95.00,
    depositAmount: 30.00,
    category: 'Somatic & Sound',
    availablePractitioners: ['practitioner_Nicole'],
    image: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80',
    benefits: [
      'Deep parasympathetic nervous system reboot',
      'Individual acoustic resonance tailored to your energy centers',
      'Anointing with Frankincense & Hinoki temple oils',
      'Complimentary warm herbal tea integration'
    ]
  },
  {
    id: 'srv_virtual_skin_spirit',
    title: 'Virtual Skin & Spirit Assessment',
    subtitle: 'High-Definition Holistic Facial & Botanical Consult',
    description: 'An intimate virtual dialogue via secure video exploring skin barrier health, circadian rhythms, dietary triggers, and topical botanical rituals designed to cultivate radiant skin from within.',
    durationMinutes: 30,
    price: 55.00,
    depositAmount: 20.00,
    category: 'Virtual',
    availablePractitioners: ['practitioner_Nicole'],
    image: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&w=800&q=80',
    benefits: [
      'Holistic facial mapping & constitutional diagnosis',
      'Customized non-toxic skincare regiment',
      '$25 product credit applied to any apothecary purchase',
      'Immediate downloadable guide with ingredient guidance'
    ]
  },
  {
    id: 'srv_ceremonial_tea',
    title: 'Mindful Japanese Tea Ceremony & Sensory Reset',
    subtitle: 'Chanoyu-Inspired Meditative Tea Gathering',
    description: 'A serene 60-minute sensory immersion exploring single-origin Uji matcha and aged wild mountain whites. Cultivate present-moment awareness, quietude, and deep sensory appreciation.',
    durationMinutes: 60,
    price: 75.00,
    depositAmount: 25.00,
    category: 'Alchemy',
    availablePractitioners: ['practitioner_Nicole'],
    image: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80',
    benefits: [
      'Whisking instruction with antique chasen bamboo whisks',
      'Tasting of 3 rare heirloom teas with seasonal wagashi sweets',
      'Quiet contemplation and guided mindfulness meditation',
      'Sample tin of ceremonial silver needle tea to take home'
    ]
  }
];

export const AVAILABLE_TIME_SLOTS = [
  '09:30 AM',
  '11:00 AM',
  '01:30 PM',
  '03:00 PM',
  '04:30 PM',
  '06:00 PM'
];