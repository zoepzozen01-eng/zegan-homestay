import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, Users, Coffee, Bike, Car, Sparkles, CheckCircle2, 
  HelpCircle, Receipt, Percent, Tag, MessageSquare, Compass, Info 
} from 'lucide-react';
import { Language, Room, AddOn } from '../types';
import { ROOMS, ADD_ONS, TRANSLATIONS } from '../data';
import { supabase } from '../lib/supabase';
import { logActivity, getQrisSettings } from '../services/adminService';
import { sendAdminNotification } from '../services/fonnte';

// Import room images
import roomEkonomi from '../assets/images/room_ekonomi_1782631326725.jpg';
import roomStandard from '../assets/images/room_standard_1782631345828.jpg';
import roomStandardMadya from '../assets/images/room_standard_madya_1782631361791.jpg';
import roomFamily from '../assets/images/room_family_1782631379795.jpg';
import roomStandardUtama from '../assets/images/room_standard_utama_1782631393687.jpg';

interface DBExtendedRoom extends Room {
  weekend_price?: number;
}

const getRoomImage = (name: string): string => {
  const norm = name.toLowerCase().trim();
  if (norm.includes('economy room')) return roomEkonomi;
  if (norm.includes('standard room pratama')) return roomStandard;
  if (norm.includes('standard room madya')) return roomStandardMadya;
  if (norm.includes('family room')) return roomFamily;
  if (norm.includes('standard room utama')) return roomStandardUtama;
  if (norm.includes('rumah')) return roomFamily;
  
  if (norm.includes('ekonomi')) return roomEkonomi;
  if (norm.includes('utama')) return roomStandardUtama;
  if (norm.includes('madya')) return roomStandardMadya;
  if (norm.includes('pratama') || norm.includes('standard')) return roomStandard;
  if (norm.includes('family')) return roomFamily;
  
  return roomStandard;
};

const getRoomMetaByName = (name: string) => {
  const norm = name.toLowerCase().trim();
  if (norm.includes('economy') || norm.includes('ekonomi')) {
    return {
      size: '12 m²',
      bedType: { id: '1 Kasur Single', en: '1 Single Bed' },
      amenities: ['wifi', 'garden-view'],
      rating: 4.6,
      capacity: 1
    };
  }
  if (norm.includes('pratama') || norm.includes('standard room') && !norm.includes('madya') && !norm.includes('utama')) {
    return {
      size: '16 m²',
      bedType: { id: '1 Kasur Double', en: '1 Double Bed' },
      amenities: ['wifi', 'ac', 'tv', 'shower', 'garden-view'],
      rating: 4.7,
      capacity: 2
    };
  }
  if (norm.includes('madya')) {
    return {
      size: '18 m²',
      bedType: { id: '1 Kasur Double', en: '1 Double Bed' },
      amenities: ['wifi', 'ac', 'tv', 'shower', 'garden-view'],
      rating: 4.8,
      capacity: 2
    };
  }
  if (norm.includes('family')) {
    return {
      size: '28 m²',
      bedType: { id: '1 Kasur Double & 1 Kasur Single', en: '1 Double Bed & 1 Single Bed' },
      amenities: ['wifi', 'ac', 'tv', 'shower', 'garden-view', 'fridge'],
      rating: 4.9,
      capacity: 3
    };
  }
  if (norm.includes('utama')) {
    return {
      size: '20 m²',
      bedType: { id: '1 Kasur Double', en: '1 Double Bed' },
      amenities: ['wifi', 'ac', 'tv', 'shower', 'garden-view'],
      rating: 4.9,
      capacity: 2
    };
  }
  if (norm.includes('rumah')) {
    return {
      size: '45 m²',
      bedType: { id: '2 Kasur Double', en: '2 Double Beds' },
      amenities: ['wifi', 'ac', 'tv', 'shower', 'garden-view', 'fridge'],
      rating: 5.0,
      capacity: 6
    };
  }
  return {
    size: '16 m²',
    bedType: { id: '1 Kasur Double', en: '1 Double Bed' },
    amenities: ['wifi', 'ac', 'tv', 'shower', 'garden-view'],
    rating: 4.8,
    capacity: 2
  };
};

const mapPrefilledRoomId = (id: string, availableRooms: DBExtendedRoom[]) => {
  if (!id) return '';
  const norm = id.toLowerCase();
  let matchedName = '';
  if (norm === 'ekonomi') matchedName = 'economy room';
  else if (norm === 'standard-room') matchedName = 'standard room pratama';
  else if (norm === 'standard-room-madya') matchedName = 'standard room madya';
  else if (norm === 'family') matchedName = 'family room';
  else if (norm === 'standard-room-utama') matchedName = 'standard room utama';
  else if (norm === 'rumah') matchedName = 'rumah';

  if (matchedName) {
    const matched = availableRooms.find(r => r.name.toLowerCase().trim().includes(matchedName));
    if (matched) return matched.id;
  }
  
  const matchedById = availableRooms.find(r => String(r.id) === String(id));
  if (matchedById) return matchedById.id;

  const matchedByName = availableRooms.find(r => r.name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(norm.replace(/[^a-z0-9]/g, '')));
  if (matchedByName) return matchedByName.id;

  return availableRooms[0]?.id || id;
};

const calculateRoomCost = (room: DBExtendedRoom, checkInStr: string, checkOutStr: string) => {
  const start = new Date(checkInStr);
  const end = new Date(checkOutStr);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
    return room ? room.price : 0;
  }

  let total = 0;
  let currentDate = new Date(start);

  while (currentDate < end) {
    const day = currentDate.getDay(); // 0: Sunday, 6: Saturday
    const isWeekend = (day === 6 || day === 0);
    const price = isWeekend && room.weekend_price ? room.weekend_price : room.price;
    total += price;
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return total;
};

interface BookingFormProps {
  lang: Language;
  prefilledRoomId: string;
  prefilledCheckIn: string;
  prefilledCheckOut: string;
  prefilledGuests: number;
  formScrollTrigger: number;
  onGoToCustomerPortal?: () => void;
}

export default function BookingForm({ 
  lang, 
  prefilledRoomId, 
  prefilledCheckIn, 
  prefilledCheckOut, 
  prefilledGuests,
  formScrollTrigger,
  onGoToCustomerPortal
}: BookingFormProps) {
  const t = TRANSLATIONS[lang];

  // Helper date generators
  const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const getTomorrowDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const getDayAfterTomorrowDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  };

  // State
  const [rooms, setRooms] = useState<DBExtendedRoom[]>(() => {
    return ROOMS.map(r => ({
      ...r,
      weekend_price: r.price
    }));
  });
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState(prefilledRoomId || 'ekonomi');
  const [checkIn, setCheckIn] = useState(prefilledCheckIn || getTomorrowDate());
  const [checkOut, setCheckOut] = useState(prefilledCheckOut || getDayAfterTomorrowDate());
  const [guests, setGuests] = useState(prefilledGuests || 2);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const selectedAddOns: string[] = [];
  
  // Coupon
  const [couponCode, setCouponCode] = useState('');
  const [activeDiscount, setActiveDiscount] = useState<{ code: string; percent: number } | null>(null);
  const [couponError, setCouponError] = useState('');

  // Booking result modal
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');

  // Fetch rooms from room_types in Supabase
  useEffect(() => {
    async function fetchRoomTypes() {
      try {
        setRoomsLoading(true);
        setRoomsError(null);
        const { data, error } = await supabase
          .from('room_types')
          .select('id, name, description, weekday_price, weekend_price, max_guest');

        if (error) {
          throw error;
        }

        if (data && data.length > 0) {
          const mapped: DBExtendedRoom[] = data.map((row: any) => {
            const meta = getRoomMetaByName(row.name);
            const image = getRoomImage(row.name);
            return {
              id: String(row.id),
              name: row.name,
              price: Number(row.weekday_price),
              weekend_price: Number(row.weekend_price),
              description: {
                id: row.description || '',
                en: row.description || ''
              },
              image: image,
              size: meta.size,
              capacity: Number(row.max_guest) || meta.capacity,
              bedType: meta.bedType,
              amenities: meta.amenities,
              rating: meta.rating
            };
          });
          setRooms(mapped);
          
          if (prefilledRoomId) {
            const mappedId = mapPrefilledRoomId(prefilledRoomId, mapped);
            setSelectedRoomId(mappedId);
          } else if (mapped.length > 0) {
            setSelectedRoomId(mapped[0].id);
          }
        }
      } catch (err: any) {
        console.error('Error loading room types from Supabase:', err);
        setRoomsError(err?.message || String(err));
        // Fallback initialized in useState already
      } finally {
        setRoomsLoading(false);
      }
    }
    fetchRoomTypes();
  }, []);

  // Auto-sync props when changed externally (quick search or booking click)
  useEffect(() => {
    if (prefilledRoomId) {
      const mappedId = mapPrefilledRoomId(prefilledRoomId, rooms);
      setSelectedRoomId(mappedId);
    }
    if (prefilledCheckIn) setCheckIn(prefilledCheckIn);
    if (prefilledCheckOut) setCheckOut(prefilledCheckOut);
    if (prefilledGuests) setGuests(prefilledGuests);
  }, [prefilledRoomId, prefilledCheckIn, prefilledCheckOut, prefilledGuests, formScrollTrigger, rooms]);

  const selectedRoom = rooms.find(r => String(r.id) === String(selectedRoomId)) || rooms[0] || ROOMS[0];

  // Date math
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
  const nightsCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

  // Pricing math
  const roomCost = calculateRoomCost(selectedRoom, checkIn, checkOut);
  const averagePrice = nightsCount > 0 ? Math.round(roomCost / nightsCount) : (selectedRoom ? selectedRoom.price : 0);

  const subtotal = roomCost;

  // Discount math
  const discountAmount = activeDiscount ? (subtotal * activeDiscount.percent) / 100 : 0;
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount * 0.10; // 10% VAT
  const finalTotal = taxableAmount + taxAmount;

  // Coupon apply
  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = couponCode.trim().toUpperCase();
    if (normalized === 'ZEGANLOVE') {
      setActiveDiscount({ code: 'ZEGANLOVE', percent: 10 });
      setCouponError('');
    } else if (normalized === 'KULONPROGO') {
      setActiveDiscount({ code: 'KULONPROGO', percent: 15 });
      setCouponError('');
    } else {
      setCouponError(lang === 'id' ? 'Voucher tidak valid' : 'Invalid coupon code');
    }
  };

  // Render add-on icons helper
  const renderAddOnIcon = (icon: string) => {
    switch (icon) {
      case 'Coffee': return <Coffee className="w-5 h-5" />;
      case 'Bike': return <Bike className="w-5 h-5" />;
      case 'Car': return <Car className="w-5 h-5" />;
      case 'Sparkles': return <Sparkles className="w-5 h-5" />;
      default: return <Coffee className="w-5 h-5" />;
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Submit and launch WhatsApp integration
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    
    // Generate simple random booking code ZG-XXXXX
    const code = 'ZG-' + Math.floor(10000 + Math.random() * 90000);
    setGeneratedCode(code);

    // 0. Check local bookings conflict (offline & online sync)
    try {
      const existingRaw = localStorage.getItem('zegan_bookings');
      const existingBookings = existingRaw ? JSON.parse(existingRaw) : [];
      
      const overlapping = existingBookings.filter((b: any) => {
        if (b.status === 'Cancelled' || b.status === 'Expired') return false;
        if (b.room_id !== selectedRoomId) return false;
        
        // Date overlap: (CheckIn1 < CheckOut2) && (CheckOut1 > CheckIn2)
        return (checkIn < b.check_out) && (checkOut > b.check_in);
      });

      // Max capacity per room type:
      // Joglo deluxe (deluxe): 2 rooms
      // Lumbung ekonomi (ekonomi): 2 rooms
      // Standard suite (standard): 2 rooms
      // Family suite (family): 1 room
      // VIP Pavilion (vip): 1 room
      let maxRooms = 2;
      if (selectedRoomId === 'family' || selectedRoomId === 'vip') {
        maxRooms = 1;
      }

      if (overlapping.length >= maxRooms) {
        throw new Error(lang === 'id'
          ? `Maaf, kamar "${selectedRoom.name}" sudah terisi penuh pada tanggal ${checkIn} s/d ${checkOut}. Silakan pilih tanggal atau tipe kamar lain.`
          : `Sorry, "${selectedRoom.name}" is fully booked from ${checkIn} to ${checkOut}. Please choose other dates or room types.`
        );
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Error checking room availability');
      setIsSubmitting(false);
      return;
    }

    // 1. Find an available physical room first to fail fast
    let roomsData: any[] | null = null;
    try {
      const { data, error: roomsQueryError } = await supabase
        .from('rooms')
        .select('id, status')
        .eq('room_type_id', selectedRoomId)
        .eq('status', 'Available')
        .limit(1);

      if (roomsQueryError) {
        throw new Error(lang === 'id' 
          ? `Gagal memeriksa ketersediaan kamar: ${roomsQueryError.message}` 
          : `Failed to check room availability: ${roomsQueryError.message}`
        );
      }
      if (!data || data.length === 0) {
        throw new Error(lang === 'id' 
          ? `Maaf, tidak ada kamar fisik "${selectedRoom.name}" yang tersedia saat ini (semua terisi/penuh).` 
          : `Sorry, there are no physical rooms available for "${selectedRoom.name}" at the moment.`
        );
      }
      roomsData = data;
    } catch (err: any) {
      setSubmitError(err.message || 'Error checking room availability');
      setIsSubmitting(false);
      return;
    }

    // 2. Insert to guests table
    let guestId: any = null;
    try {
      const { data: guestData, error: guestError } = await supabase
        .from('guests')
        .insert([
          {
            full_name: fullName,
            phone: phone,
            email: email
          }
        ])
        .select('id');

      if (guestError) {
        throw new Error(lang === 'id'
          ? `Gagal menyimpan data tamu: ${guestError.message}`
          : `Failed to save guest data: ${guestError.message}`
        );
      }
      if (!guestData || guestData.length === 0) {
        throw new Error(lang === 'id'
          ? 'Gagal mendapatkan ID tamu setelah pendaftaran.'
          : 'Failed to retrieve guest ID after insertion.'
        );
      }
      guestId = guestData[0].id;
    } catch (err: any) {
      setSubmitError(err.message || 'Error registering guest');
      setIsSubmitting(false);
      return;
    }

    // 3. Insert to bookings table
    try {
      const { error: bookingError } = await supabase
        .from('bookings')
        .insert([
          {
            booking_code: code,
            guest_id: guestId,
            room_id: roomsData[0].id,
            check_in: checkIn,
            check_out: checkOut,
            adults: guests,
            total_price: finalTotal,
            special_request: specialRequests,
            payment_status: 'Pending',
            booking_status: 'Pending',
            admin_notification_sent: false
          }
        ]);

      if (bookingError) {
        throw new Error(lang === 'id'
          ? `Gagal membuat pesanan di database: ${bookingError.message}`
          : `Failed to create booking in database: ${bookingError.message}`
        );
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Error processing booking');
      setIsSubmitting(false);
      return;
    }

    // Direct WhatsApp send to Admin via Fonnte API
    let isNotificationSent = false;
    const tempBookingForNotif = {
      booking_code: code,
      room_id: selectedRoomId,
      check_in: checkIn,
      check_out: checkOut,
      guests: guests,
      full_name: fullName,
      email: email,
      phone: phone,
      total_price: finalTotal,
      status: 'Pending' as any,
      payment_status: 'Pending' as any,
      created_at: new Date().toISOString()
    };

    try {
      isNotificationSent = await sendAdminNotification(tempBookingForNotif, selectedRoom.name);
      if (isNotificationSent) {
        // Update database with true
        const { error: updateError } = await supabase
          .from('bookings')
          .update({ admin_notification_sent: true })
          .eq('booking_code', code);
        
        if (updateError) {
          console.warn('[BookingForm] Failed to update admin_notification_sent in Supabase:', updateError);
        }
      }
    } catch (notifErr) {
      console.error('[BookingForm] Exception sending admin notification:', notifErr);
    }

    const bookingPayload = {
      booking_code: code,
      room_id: selectedRoomId,
      room_name: selectedRoom.name,
      check_in: checkIn,
      check_out: checkOut,
      guests: guests,
      full_name: fullName,
      email: email,
      phone: phone,
      special_requests: specialRequests,
      total_price: finalTotal,
      status: 'Pending' as any,
      payment_status: 'Pending' as any,
      created_at: new Date().toISOString(),
      admin_notification_sent: isNotificationSent
    };

    // Save to local storage for local backup
    try {
      const existingRaw = localStorage.getItem('zegan_bookings');
      const existing = existingRaw ? JSON.parse(existingRaw) : [];
      existing.push(bookingPayload);
      localStorage.setItem('zegan_bookings', JSON.stringify(existing));
      
      // Log the activity
      logActivity('Customer', 'Customer', `Booking baru dibuat oleh customer dengan kode ${code} (${selectedRoom.name}).`);
    } catch (err) {
      console.warn('Could not save booking backup locally:', err);
    }

    setIsSubmitting(false);
    setBookingSuccess(true);
  };

  const getWhatsAppMessage = () => {
    const voucherLine = activeDiscount 
      ? `\n- Voucher: ${activeDiscount.code} (Diskon ${activeDiscount.percent}%)`
      : '';

    const text = 
`Halo Admin Zegan Homestay! Saya ingin memesan kamar dengan detail berikut:

🏨 *KODE BOOKING: ${generatedCode}*
----------------------------------------
• Kamar: ${selectedRoom.name}
• Check-in: ${checkIn}
• Check-out: ${checkOut}
• Durasi: ${nightsCount} malam
• Tamu: ${guests} orang${voucherLine}
• Total Pembayaran: Rp${finalTotal.toLocaleString('id-ID')}

👤 *DATA PEMESAN:*
• Nama: ${fullName}
• Email: ${email}
• WhatsApp/HP: ${phone}
• Permintaan Khusus: ${specialRequests || '-'}

Mohon konfirmasi ketersediaan kamarnya. Terima kasih!`;

    return encodeURIComponent(text);
  };

  const whatsAppUrl = `https://wa.me/6285188144499?text=${getWhatsAppMessage()}`;

  return (
    <section id="booking" className="py-24 bg-brand-50 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-700 border border-brand-200/80 px-4 py-1.5 rounded-full bg-brand-100 inline-block">
            RESERVE SANCTUARY
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-normal text-brand-950 mt-3 leading-tight">
            {t.bookingFormTitle}
          </h2>
          <div className="w-12 h-[2px] bg-brand-300 mx-auto mt-4 mb-4" />
          <p className="text-stone-600 text-sm sm:text-base mt-2">
            {t.bookingFormSub}
          </p>
        </div>

        {/* Outer Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          {/* Booking Inputs (8 Cols) */}
          <form onSubmit={handleSubmitBooking} className="lg:col-span-7 bg-brand-100/40 rounded-xl p-6 sm:p-10 border border-brand-200 space-y-8">
            
            {roomsError && (
              <div className="bg-red-50 text-red-800 border border-red-200 rounded-xl p-4 text-xs flex flex-col gap-1.5 leading-relaxed">
                <div className="font-semibold text-red-900 flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                  Gagal Memuat Kamar Real-time (Supabase Error):
                </div>
                <code className="bg-red-100 px-2 py-1 rounded select-all font-mono break-all font-medium text-red-950 block">{roomsError}</code>
                <p className="text-stone-500 mt-1">
                  Aplikasi otomatis beralih menggunakan data cadangan (offline fallback), Anda masih dapat melanjutkan pengisian formulir.
                </p>
              </div>
            )}

            {/* Step 1: Stay Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-serif font-normal text-brand-950 flex items-center gap-2 border-b border-brand-200/80 pb-3 mb-6">
                <span className="w-6 h-6 rounded-full bg-brand-700 text-brand-100 text-xs flex items-center justify-center font-sans font-bold">1</span>
                {lang === 'id' ? 'Detail Menginap' : 'Stay Details'}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-brand-950/70 mb-2">
                    {t.chooseRoom}
                    {roomsLoading && (
                      <span className="text-stone-500 text-[10px] ml-2 animate-pulse font-normal">
                        ({lang === 'id' ? 'Memuat...' : 'Loading...'})
                      </span>
                    )}
                  </label>
                  <select
                    id="booking-room-type"
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="w-full px-4 py-3 bg-brand-50 rounded-lg border border-brand-200 text-brand-950 text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-600 focus:border-brand-600 font-medium transition-colors"
                  >
                    {roomsLoading ? (
                      <option disabled>{lang === 'id' ? 'Memuat tipe kamar...' : 'Loading room types...'}</option>
                    ) : (
                      rooms.map(r => {
                        const checkInDay = new Date(checkIn).getDay();
                        const isWeekendCheckIn = (checkInDay === 6 || checkInDay === 0);
                        const displayPrice = isWeekendCheckIn && r.weekend_price ? r.weekend_price : r.price;
                        return (
                          <option key={r.id} value={r.id}>
                            {r.name} - Rp{displayPrice.toLocaleString('id-ID')}/{t.perNight}
                          </option>
                        );
                      })
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-950/70 mb-2">{t.guestsCount}</label>
                  <select
                    id="booking-guests-count"
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-brand-50 rounded-lg border border-brand-200 text-brand-950 text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-600 focus:border-brand-600 font-medium transition-colors"
                  >
                    {[1, 2, 3, 4, 5, 6].map(num => (
                      <option key={num} value={num}>
                        {num} {lang === 'id' ? 'Orang' : 'Guests'} (Max {selectedRoom.capacity})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-brand-950/70 mb-2">{t.checkIn}</label>
                  <input
                    id="booking-check-in"
                    type="date"
                    min={getTodayDate()}
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                    className="w-full px-4 py-3 bg-brand-50 rounded-lg border border-brand-200 text-brand-950 text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-600 focus:border-brand-600 font-medium transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-950/70 mb-2">{t.checkOut}</label>
                  <input
                    id="booking-check-out"
                    type="date"
                    min={checkIn}
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                    className="w-full px-4 py-3 bg-brand-50 rounded-lg border border-brand-200 text-brand-950 text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-600 focus:border-brand-600 font-medium transition-colors"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Customer Personal Info */}
            <div className="space-y-4">
              <h3 className="text-lg font-serif font-normal text-brand-950 flex items-center gap-2 border-b border-brand-200/80 pb-3 mb-6">
                <span className="w-6 h-6 rounded-full bg-brand-700 text-brand-100 text-xs flex items-center justify-center font-sans font-bold">2</span>
                {lang === 'id' ? 'Informasi Pribadi Pemesan' : 'Guest Information'}
              </h3>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-brand-950/70 mb-2">{t.fullName}</label>
                  <input
                    id="booking-full-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={lang === 'id' ? 'Budi Santoso' : 'John Doe'}
                    className="w-full px-4 py-3 bg-brand-50 rounded-lg border border-brand-200 text-brand-950 text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-600 focus:border-brand-600 font-medium transition-colors"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-brand-950/70 mb-2">{t.email}</label>
                    <input
                      id="booking-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@gmail.com"
                      className="w-full px-4 py-3 bg-brand-50 rounded-lg border border-brand-200 text-brand-950 text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-600 focus:border-brand-600 font-medium transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-brand-950/70 mb-2">{t.phone}</label>
                    <input
                      id="booking-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="08123456789"
                      className="w-full px-4 py-3 bg-brand-50 rounded-lg border border-brand-200 text-brand-950 text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-600 focus:border-brand-600 font-medium transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-brand-950/70 mb-2">{t.specialRequests}</label>
                  <textarea
                    id="booking-special-requests"
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    placeholder={lang === 'id' ? 'Ranjang dihias batik, request menu sarapan vegetarian, dll.' : 'Honeymoon arrangement, late check-in request, vegetarian breakfast option, etc.'}
                    rows={2}
                    className="w-full px-4 py-3 bg-brand-50 rounded-lg border border-brand-200 text-brand-950 text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-600 focus:border-brand-600 font-medium resize-none transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Error Message */}
            {submitError && (
              <div className="bg-red-50 text-red-600 border border-red-200 rounded-lg p-4 text-xs font-medium flex items-center gap-2">
                <Info className="w-4 h-4 shrink-0 text-red-500" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-4">
              <button
                id="submit-booking-form"
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-brand-700 hover:bg-brand-850 disabled:bg-brand-500 disabled:cursor-not-allowed text-white font-bold py-4 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>{lang === 'id' ? 'Memproses...' : 'Processing...'}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{lang === 'id' ? 'Proses Reservasi Kamar' : 'Process Room Reservation'}</span>
                  </>
                )}
              </button>
            </div>

          </form>

          {/* Pricing Calculator Card (5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Live Receipt Card */}
            <div className="bg-brand-950 text-brand-100 rounded-xl p-6 sm:p-8 border border-brand-800 relative overflow-hidden">
              {/* Traditional watermark look */}
              <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full border border-brand-800/35 flex items-center justify-center">
                <Compass className="w-20 h-20 text-brand-800/20 animate-spin-slow" />
              </div>

              <h3 className="text-lg font-serif font-normal text-white border-b border-brand-800 pb-4 mb-4 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-brand-300" />
                {t.summaryTitle}
              </h3>

              {/* Room Selected Item */}
              <div className="flex gap-4 mb-6 pb-6 border-b border-brand-800">
                <img 
                  src={selectedRoom.image} 
                  alt={selectedRoom.name} 
                  className="w-16 h-16 object-cover rounded-lg bg-brand-900 shrink-0 border border-brand-800"
                />
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-brand-300 font-bold">Stay Room Type</span>
                  <h4 className="font-bold text-white text-sm mt-0.5">{selectedRoom.name}</h4>
                  <div className="flex items-center gap-1.5 text-xs text-brand-200/60 mt-1">
                    <Calendar className="w-3.5 h-3.5 text-brand-400" />
                    <span>{nightsCount} {lang === 'id' ? 'Malam' : 'Nights'} ({checkIn} - {checkOut})</span>
                  </div>
                </div>
              </div>

              {/* Subtotal break downs */}
              <div className="space-y-3.5 text-xs">
                
                {/* Room charge */}
                <div className="flex justify-between">
                  <span className="text-brand-200/80">
                    {t.pricePerNight} {nightsCount > 1 ? `(Avg x${nightsCount})` : `(x${nightsCount})`}
                  </span>
                  <span className="font-semibold text-brand-100">
                    Rp{averagePrice.toLocaleString('id-ID')}
                  </span>
                </div>

                {/* Room subtotal */}
                <div className="flex justify-between border-b border-brand-800 pb-3">
                  <span className="text-brand-200/80 font-medium">{t.baseTotal}</span>
                  <span className="font-bold text-white">
                    Rp{roomCost.toLocaleString('id-ID')}
                  </span>
                </div>

                {/* Discount display */}
                {activeDiscount && (
                  <div className="flex justify-between text-brand-300 bg-brand-900/40 p-2.5 rounded-lg border border-brand-850">
                    <span className="flex items-center gap-1">
                      <Tag className="w-3.5 h-3.5" />
                      Promo Applied: {activeDiscount.code} ({activeDiscount.percent}%)
                    </span>
                    <span className="font-bold">
                      - Rp{discountAmount.toLocaleString('id-ID')}
                    </span>
                  </div>
                )}

                {/* Tax */}
                <div className="flex justify-between pt-2">
                  <span className="text-brand-200/80">{t.taxService}</span>
                  <span className="font-semibold text-brand-100">
                    Rp{taxAmount.toLocaleString('id-ID')}
                  </span>
                </div>

                {/* Final Total */}
                <div className="flex justify-between items-baseline pt-4 border-t border-brand-800 text-sm">
                  <span className="text-white font-serif font-bold text-base">{t.finalTotal}</span>
                  <span className="text-xl sm:text-2xl font-serif font-black text-brand-300">
                    Rp{finalTotal.toLocaleString('id-ID')}
                  </span>
                </div>

              </div>
            </div>

            {/* Voucher apply box */}
            <div className="bg-brand-100/40 rounded-xl p-6 border border-brand-200">
              <h4 className="text-sm font-bold text-brand-950 flex items-center gap-1.5 mb-3 font-serif">
                <Percent className="w-4 h-4 text-brand-600" />
                {lang === 'id' ? 'Mempunyai Kode Voucher?' : 'Have a Promo Voucher?'}
              </h4>
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input
                  id="coupon-input"
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="e.g. ZEGANLOVE"
                  className="flex-1 px-4 py-2 bg-brand-50 border border-brand-200 rounded-lg text-brand-950 text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-600 focus:border-brand-600 font-bold uppercase placeholder-stone-400"
                />
                <button
                  id="apply-coupon-btn"
                  type="submit"
                  className="bg-brand-700 hover:bg-brand-850 text-white font-semibold text-xs uppercase px-4 rounded-lg transition-all cursor-pointer"
                >
                  Apply
                </button>
              </form>
              
              {/* Voucher guidance */}
              <div className="mt-3 text-[11px] text-stone-500 flex items-start gap-1">
                <Info className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                <span className="font-light">
                  {lang === 'id' 
                    ? 'Gunakan ZEGANLOVE (diskon 10%) atau KULONPROGO (diskon 15%) untuk potongan khusus!' 
                    : 'Use ZEGANLOVE (10% off) or KULONPROGO (15% off) for authentic Javanese discount!'}
                </span>
              </div>

              {couponError && (
                <p className="text-xs text-red-500 mt-2 font-medium">{couponError}</p>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* Success Booking Receipt Lightbox Overlay */}
      <AnimatePresence>
        {bookingSuccess && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            <div className="absolute inset-0" onClick={() => setBookingSuccess(false)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-brand-50 rounded-xl shadow-2xl overflow-y-auto max-h-[90vh] z-10 p-6 sm:p-8 border border-brand-200"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-200">
                  <CheckCircle2 className="w-6 h-6" />
                </div>

                <span className="text-xs uppercase tracking-widest text-emerald-850 bg-emerald-100 border border-emerald-200/60 px-3 py-1 rounded-full inline-block font-semibold">
                  {lang === 'id' ? 'Menunggu Pembayaran QRIS' : 'Awaiting QRIS Payment'}
                </span>

                <h3 className="text-xl font-serif font-normal text-brand-950 mt-3 leading-tight">
                  {lang === 'id' ? 'Pesanan Berhasil Dibuat!' : 'Booking Created Successfully!'}
                </h3>

                <p className="text-stone-600 text-xs mt-1 leading-relaxed font-light">
                  {lang === 'id' 
                    ? 'Silakan selesaikan pembayaran menggunakan QRIS statis di bawah ini.' 
                    : 'Please complete your payment using the static QRIS below.'}
                </p>

                {/* Text receipt breakdown */}
                <div className="my-4 bg-brand-100/40 p-3 rounded-lg text-left text-xs border border-brand-200 space-y-1.5">
                  <div className="flex justify-between border-b border-brand-200/40 pb-1.5">
                    <span className="text-stone-500 font-semibold">Booking ID</span>
                    <span className="font-bold text-brand-800 font-mono text-sm">{generatedCode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Kamar / Room</span>
                    <span className="font-bold text-brand-950">{selectedRoom.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Durasi / Duration</span>
                    <span className="font-semibold text-brand-950">{nightsCount} {lang === 'id' ? 'malam' : 'nights'}</span>
                  </div>
                  <div className="flex justify-between border-t border-brand-200/40 pt-1.5 text-sm font-bold">
                    <span className="font-serif text-brand-950">{lang === 'id' ? 'Total Harga' : 'Total Price'}</span>
                    <span className="font-serif text-brand-800">Rp{finalTotal.toLocaleString('id-ID')}</span>
                  </div>
                </div>

                {/* QRIS Static Display Section */}
                {(() => {
                  const qris = getQrisSettings();
                  return (
                    <div className="my-4 bg-white p-4 rounded-lg border border-brand-200 shadow-xs flex flex-col items-center">
                      <span className="text-[10px] uppercase tracking-widest text-brand-800 font-bold mb-2">
                        {lang === 'id' ? 'SCAN QRIS ZEGAN HOMESTAY' : 'SCAN ZEGAN QRIS'}
                      </span>
                      <img
                        src={qris.imageUrl}
                        alt="QRIS Merchant"
                        className="w-36 h-36 object-contain"
                        referrerPolicy="no-referrer"
                      />
                      <div className="text-center mt-2 space-y-1">
                        <span className="text-[11px] font-bold text-stone-900 block font-mono">{qris.bankName}</span>
                        <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded inline-block border border-emerald-100">
                          {qris.accountName}
                        </span>
                      </div>
                      <p className="text-[10px] text-stone-500 leading-relaxed mt-2.5 text-left bg-brand-50/50 p-2.5 rounded border border-brand-200/50 font-light">
                        {qris.instructions}
                      </p>
                    </div>
                  );
                })()}

                {/* Status indicator that WhatsApp notification was sent to Admin */}
                <div className="mb-4 bg-emerald-50 text-emerald-800 text-[10px] px-3 py-2 rounded-lg border border-emerald-100 flex items-center justify-center gap-1.5">
                  <span className="animate-pulse font-bold text-xs">🔔</span>
                  <span className="text-left leading-tight font-medium">
                    {lang === 'id'
                      ? 'WhatsApp pemberitahuan otomatis telah dikirim langsung ke Admin.'
                      : 'An automated WhatsApp notification has been sent directly to the Admin.'}
                  </span>
                </div>

                {/* Call to action buttons */}
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setBookingSuccess(false);
                      if (onGoToCustomerPortal) {
                        onGoToCustomerPortal();
                      }
                    }}
                    className="bg-brand-700 hover:bg-brand-850 text-white font-bold py-3.5 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider cursor-pointer"
                  >
                    <Receipt className="w-4 h-4" />
                    <span>{lang === 'id' ? 'Unggah Bukti Pembayaran' : 'Upload Payment Proof'}</span>
                  </button>

                  <button
                    id="close-success-booking"
                    onClick={() => setBookingSuccess(false)}
                    className="bg-brand-100 hover:bg-brand-200 text-brand-950 font-semibold py-2.5 rounded-lg text-xs uppercase tracking-widest transition-all cursor-pointer border border-brand-300/40"
                  >
                    {lang === 'id' ? 'Tutup' : 'Close'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
