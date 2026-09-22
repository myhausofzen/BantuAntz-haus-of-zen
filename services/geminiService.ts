export const getNarrativePrescription = async (feeling: string): Promise<string> => {
  try {
    const res = await fetch('/api/prescription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ feeling })
    });

    if (!res.ok) {
      throw new Error(`Prescription API returned ${res.status}`);
    }

    const data = await res.json();
    return data.prescription || "The silence speaks when words fail. Breathe deeply.";
  } catch (error) {
    console.error("Error fetching prescription:", error);
    return "We prescribe three moments of stillness under the open sky, and warm botanical tea to anchor the spirit.";
  }
};