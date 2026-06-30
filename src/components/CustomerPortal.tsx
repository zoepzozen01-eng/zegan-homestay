import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Calendar, Users, FileText, CheckCircle2, Clock, XCircle, AlertTriangle, ArrowRight, Upload, Check, CreditCard, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { Booking, BookingStatus, PaymentStatus } from '../types';
import { getQrisSettings, getWhatsappSettings, logActivity } from '../services/adminService';
import InvoicePDF from './InvoicePDF';

interface CustomerPortalProps {
  lang: 'id' | 'en';
}

export default function CustomerPortal({ lang }: CustomerPortalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Booking[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'cancelled'>('active');
  const [uploadingCode, setUploadingCode] = useState<string | null>(null);
  const [uploadedProof, setUploadedProof] = useState<string | null>(null);
  const [selectedInvoiceBooking, setSelectedInvoiceBooking] = useState<Booking | null>(null);

  const qris = getQrisSettings();
  const wa = getWhatsappSettings();

  // Load bookings from local storage or database on mount/search
  const performSearch = () => {
    setError(null);
    setHasSearched(true);
    
    if (!searchQuery.trim()) {
      setError(lang === 'id' ? 'Silakan masukkan nomor HP, email, atau kode booking.' : 'Please enter a phone number, email, or booking code.');
      return;
    }

    const cleanQuery = searchQuery.trim().toLowerCase();

    try {
      const raw = localStorage.getItem('zegan_bookings');
      if (raw) {
        const allBookings: Booking[] = JSON.parse(raw);
        
        // Match by phone, email, or booking code
        const matched = allBookings.filter(b => {
          const matchCode = b.booking_code.toLowerCase().includes(cleanQuery);
          const matchEmail = b.email.toLowerCase().includes(cleanQuery);
          const matchPhone = b.phone.replace(/[^0-9]/g, '').includes(cleanQuery.replace(/[^0-9]/g, ''));
          return matchCode || matchEmail || matchPhone;
        });

        // Sort by created_at desc
        matched.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        setSearchResults(matched);

        if (matched.length === 0) {
          setError(lang === 'id' ? 'Tidak ditemukan riwayat pemesanan untuk data tersebut.' : 'No reservation history found for this query.');
        }
      } else {
        setSearchResults([]);
        setError(lang === 'id' ? 'Belum ada data pemesanan di sistem.' : 'No bookings in the system yet.');
      }
    } catch (err) {
      console.error(err);
      setError(lang === 'id' ? 'Terjadi kesalahan saat memuat data.' : 'An error occurred while loading data.');
    }
  };

  // Helper categorized groups
  const getCategorizedResults = () => {
    const active: Booking[] = [];
    const completed: Booking[] = [];
    const cancelled: Booking[] = [];

    searchResults.forEach(b => {
      const s = b.status;
      if (s === 'Completed') {
        completed.push(b);
      } else if (s === 'Cancelled' || s === 'Expired') {
        cancelled.push(b);
      } else {
        // Pending, Waiting Verification, Paid, Checked In
        active.push(b);
      }
    });

    return { active, completed, cancelled };
  };

  const { active, completed, cancelled } = getCategorizedResults();
  const displayedList = activeTab === 'active' ? active : activeTab === 'completed' ? completed : cancelled;

  // Handle proof simulation upload
  const handleUploadProof = (bookingCode: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setUploadedProof(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const submitPaymentProof = (bookingCode: string) => {
    if (!uploadedProof) return;

    try {
      const raw = localStorage.getItem('zegan_bookings');
      if (raw) {
        const bookings: Booking[] = JSON.parse(raw);
        const idx = bookings.findIndex(b => b.booking_code === bookingCode);
        
        if (idx !== -1) {
          bookings[idx] = {
            ...bookings[idx],
            status: 'Waiting Verification',
            payment_status: 'Waiting Verification',
            payment_proof: uploadedProof,
            payment_date: new Date().toISOString()
          };

          localStorage.setItem('zegan_bookings', JSON.stringify(bookings));
          logActivity(
            'Customer',
            'Customer',
            `Bukti pembayaran diunggah untuk booking ${bookingCode}. Status beralih ke Waiting Verification.`
          );

          // Update local search results state
          setSearchResults(prev => prev.map(b => b.booking_code === bookingCode ? bookings[idx] : b));
          setUploadedProof(null);
          setUploadingCode(null);

          // Show success message
          alert(lang === 'id' ? 'Bukti pembayaran berhasil diunggah! Admin akan segera memverifikasi pesanan Anda.' : 'Payment proof successfully uploaded! Our admin will verify your payment shortly.');
        }
      }
    } catch (err) {
      console.error(err);
      alert('Error saving payment proof');
    }
  };

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200">
            <Clock className="w-3 h-3 animate-pulse" />
            PENDING
          </span>
        );
      case 'Waiting Verification':
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200">
            <Clock className="w-3 h-3 shrink-0" />
            MENUNGGU VERIFIKASI
          </span>
        );
      case 'Paid':
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            LUNAS
          </span>
        );
      case 'Checked In':
        return (
          <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-200">
            <Check className="w-3 h-3" />
            CHECKED IN
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1 bg-stone-100 text-stone-700 text-[10px] font-bold px-2 py-0.5 rounded border border-stone-200">
            <CheckCircle2 className="w-3 h-3" />
            SELESAI
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded border border-red-200">
            <XCircle className="w-3 h-3" />
            DIBATALKAN
          </span>
        );
      case 'Expired':
        return (
          <span className="inline-flex items-center gap-1 bg-stone-200 text-stone-600 text-[10px] font-bold px-2 py-0.5 rounded border border-stone-300">
            <AlertTriangle className="w-3 h-3" />
            EXPIRED
          </span>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Title */}
      <div className="text-center space-y-2 mb-10">
        <h2 className="text-3xl font-serif font-normal text-brand-950 tracking-tight">
          {lang === 'id' ? 'Riwayat Booking & Portal Layanan' : 'Booking History & Portal'}
        </h2>
        <p className="text-sm text-stone-500 max-w-lg mx-auto leading-relaxed">
          {lang === 'id' 
            ? 'Cari riwayat pemesanan, unggah bukti pembayaran transfer QRIS, atau unduh invoice resmi Anda.' 
            : 'Find your reservations, upload payment proofs, or download your official invoice instantly.'}
        </p>
      </div>

      {/* Search Input Card */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-brand-200 shadow-md max-w-2xl mx-auto mb-12">
        <div className="space-y-4">
          <label className="block text-xs font-bold text-brand-950 uppercase tracking-widest text-center sm:text-left">
            {lang === 'id' ? 'Masukkan Data Reservasi' : 'Enter Booking Details'}
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <input
                id="portal-search-input"
                type="text"
                placeholder={lang === 'id' ? 'Kode Booking, Email, atau No WhatsApp' : 'Booking Code, Email, or WhatsApp Number'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && performSearch()}
                className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-brand-200 rounded-xl text-brand-950 text-sm focus:outline-hidden focus:ring-2 focus:ring-brand-600 focus:border-brand-600 transition-all font-medium"
              />
              <Search className="w-4 h-4 text-stone-400 absolute left-4 top-3.5" />
            </div>
            <button
              id="portal-search-button"
              onClick={performSearch}
              className="bg-brand-700 hover:bg-brand-850 text-white font-semibold text-xs uppercase tracking-wider px-6 py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
            >
              <span>{lang === 'id' ? 'Cari Riwayat' : 'Search Records'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          <span className="block text-[10px] text-stone-400 italic text-center sm:text-left">
            {lang === 'id' 
              ? '*Format pencarian No HP bebas, misal: "0851..." atau "62851..."' 
              : '*Phone search supports formatting flexibility like "0851..." or "62851..."'}
          </span>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs max-w-2xl mx-auto flex items-center gap-2">
          <AlertTriangle className="w-4.5 h-4.5 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Workspace */}
      {hasSearched && searchResults.length > 0 && (
        <div className="space-y-8">
          {/* Tab Selection */}
          <div className="flex border-b border-brand-200">
            <button
              onClick={() => setActiveTab('active')}
              className={`flex-1 pb-3 text-xs uppercase tracking-wider font-bold transition-all border-b-2 text-center cursor-pointer ${
                activeTab === 'active' 
                  ? 'border-brand-700 text-brand-900' 
                  : 'border-transparent text-stone-400 hover:text-stone-600'
              }`}
            >
              {lang === 'id' ? `Booking Aktif (${active.length})` : `Active (${active.length})`}
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`flex-1 pb-3 text-xs uppercase tracking-wider font-bold transition-all border-b-2 text-center cursor-pointer ${
                activeTab === 'completed' 
                  ? 'border-brand-700 text-brand-900' 
                  : 'border-transparent text-stone-400 hover:text-stone-600'
              }`}
            >
              {lang === 'id' ? `Booking Selesai (${completed.length})` : `Completed (${completed.length})`}
            </button>
            <button
              onClick={() => setActiveTab('cancelled')}
              className={`flex-1 pb-3 text-xs uppercase tracking-wider font-bold transition-all border-b-2 text-center cursor-pointer ${
                activeTab === 'cancelled' 
                  ? 'border-brand-700 text-brand-900' 
                  : 'border-transparent text-stone-400 hover:text-stone-600'
              }`}
            >
              {lang === 'id' ? `Batal / Expired (${cancelled.length})` : `Cancelled / Expired (${cancelled.length})`}
            </button>
          </div>

          {/* Cards Grid */}
          <div className="space-y-6">
            {displayedList.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-brand-100/60 p-8 space-y-2">
                <div className="text-4xl text-stone-300">📅</div>
                <p className="text-sm font-semibold text-stone-600">
                  {lang === 'id' ? 'Tidak ada data di tab ini.' : 'No items found in this tab.'}
                </p>
                <p className="text-xs text-stone-400">
                  {lang === 'id' ? 'Silakan periksa tab riwayat lainnya.' : 'Check other tabs for older histories.'}
                </p>
              </div>
            ) : (
              displayedList.map((booking) => {
                const isPending = booking.status === 'Pending';
                
                return (
                  <div 
                    key={booking.booking_code}
                    className="bg-white rounded-2xl border border-brand-200 overflow-hidden shadow-xs hover:shadow-md transition-all p-6 sm:p-8 space-y-6"
                  >
                    {/* Top Row: Code and Status */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b border-stone-100 pb-4">
                      <div>
                        <span className="text-[10px] text-stone-400 font-bold block uppercase tracking-wider">
                          KODE BOOKING
                        </span>
                        <span className="font-mono font-bold text-lg text-brand-950">
                          {booking.booking_code}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(booking.status)}
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-1">
                        <span className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider block">KAMAR & TAMU</span>
                        <p className="font-semibold text-brand-900 text-sm">{booking.room_name || 'Kamar Zegan'}</p>
                        <p className="text-xs text-stone-600 flex items-center gap-1.5 mt-0.5">
                          <Users className="w-3.5 h-3.5 text-brand-700" />
                          {booking.guests} Tamu / Guests
                        </p>
                        <p className="text-xs text-stone-500 font-semibold mt-1">
                          Nomor Kamar: <span className="bg-brand-100 text-brand-900 px-1.5 py-0.5 rounded font-mono text-xs">{booking.room_number || 'A-1'}</span>
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider block">TANGGAL MENGINAP</span>
                        <div className="flex items-center gap-1 text-xs text-stone-700 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-brand-700 shrink-0" />
                          <span>{booking.check_in}</span>
                          <ArrowRight className="w-3 h-3 text-stone-400" />
                          <span>{booking.check_out}</span>
                        </div>
                        <p className="text-[10px] text-stone-500 italic mt-0.5">
                          Check-in jam 14:00, Check-out jam 12:00
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider block">BIAYA & TRANSAKSI</span>
                        <p className="font-serif font-bold text-lg text-brand-850">
                          Rp{booking.total_price?.toLocaleString('id-ID')}
                        </p>
                        <span className="text-[10px] text-stone-500 block">
                          Status Bayar: <span className="font-bold underline uppercase">{booking.payment_status || 'Pending'}</span>
                        </span>
                      </div>
                    </div>

                    {/* QRIS / Proof Upload workflow for PENDING bookings */}
                    {isPending && (
                      <div className="bg-brand-50/50 rounded-xl p-4 sm:p-6 border border-brand-100 space-y-4">
                        <div className="flex flex-col sm:flex-row gap-6 items-start">
                          {/* QRIS image view */}
                          <div className="bg-white p-2.5 rounded-xl border border-brand-200 shadow-xs shrink-0 mx-auto sm:mx-0 text-center">
                            <img
                              src={qris.imageUrl}
                              alt="QRIS Merchant"
                              className="w-28 h-28 object-contain"
                              referrerPolicy="no-referrer"
                            />
                            <span className="text-[9px] font-bold text-brand-900 font-mono mt-1 block">
                              {qris.bankName}
                            </span>
                          </div>

                          {/* Payment Instruction */}
                          <div className="space-y-2 text-xs flex-1">
                            <h4 className="font-bold text-brand-950 flex items-center gap-1.5">
                              <CreditCard className="w-4 h-4 text-brand-700" />
                              Instruksi Pembayaran QRIS:
                            </h4>
                            <p className="text-stone-600 leading-relaxed">
                              {qris.instructions}
                            </p>
                            <p className="font-semibold text-brand-900 bg-brand-100/60 p-2 rounded">
                              Nama Rekening: {qris.accountName}
                            </p>
                          </div>
                        </div>

                        {/* Interactive proof submission block */}
                        <div className="pt-4 border-t border-brand-200/50">
                          {uploadingCode === booking.booking_code ? (
                            <div className="bg-white rounded-xl border border-dashed border-stone-300 p-4 space-y-4">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-stone-700">Pilih File Bukti Transfer</span>
                                <button
                                  onClick={() => {
                                    setUploadingCode(null);
                                    setUploadedProof(null);
                                  }}
                                  className="text-stone-400 hover:text-red-500 text-xs font-semibold cursor-pointer"
                                >
                                  Batal
                                </button>
                              </div>

                              <div className="flex flex-col items-center justify-center border border-dashed border-stone-200 bg-stone-50 rounded-lg p-6 hover:bg-stone-100/50 transition-all cursor-pointer relative">
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleUploadProof(booking.booking_code, e)}
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                />
                                {uploadedProof ? (
                                  <div className="flex flex-col items-center gap-2">
                                    <ImageIcon className="w-8 h-8 text-emerald-600 animate-bounce" />
                                    <span className="text-xs font-semibold text-emerald-800">Gambar Terpilih!</span>
                                    <img src={uploadedProof} alt="Proof" className="max-h-24 object-contain rounded mt-1 border" />
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center gap-2 text-center">
                                    <Upload className="w-8 h-8 text-brand-600" />
                                    <span className="text-xs font-semibold text-brand-950">Seret atau Klik untuk Unggah Bukti</span>
                                    <span className="text-[10px] text-stone-400">JPG, PNG up to 2MB</span>
                                  </div>
                                )}
                              </div>

                              {uploadedProof && (
                                <button
                                  id="submit-payment-proof"
                                  onClick={() => submitPaymentProof(booking.booking_code)}
                                  className="w-full bg-brand-700 hover:bg-brand-850 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all"
                                >
                                  <Check className="w-4 h-4" />
                                  <span>Kirim Bukti Pembayaran</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              id="btn-trigger-upload-proof"
                              onClick={() => setUploadingCode(booking.booking_code)}
                              className="w-full bg-brand-700 hover:bg-brand-850 text-white font-bold py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all"
                            >
                              <Upload className="w-4 h-4" />
                              <span>Unggah Bukti Pembayaran</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* View Invoice and Support Action Buttons */}
                    <div className="pt-4 border-t border-stone-100 flex flex-wrap justify-between items-center gap-3">
                      <div className="text-[11px] text-stone-400">
                        {booking.payment_proof && (
                          <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                            <Check className="w-3.5 h-3.5 shrink-0" />
                            Bukti Pembayaran Sudah Diunggah
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {/* If Paid, Checked In, or Completed, can view Invoice */}
                        {['Paid', 'Checked In', 'Completed'].includes(booking.status) ? (
                          <button
                            id={`btn-view-invoice-${booking.booking_code}`}
                            onClick={() => setSelectedInvoiceBooking(booking)}
                            className="bg-brand-100 hover:bg-brand-200 text-brand-900 font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <FileText className="w-4 h-4" />
                            <span>Lihat Invoice PDF</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-stone-400 bg-stone-50 px-2 py-1 rounded border">
                            Invoice Tersedia Setelah Lunas
                          </span>
                        )}

                        <a
                          href={`https://wa.me/${wa.phoneNumber}?text=Halo%20Admin%20Zegan%20Homestay%21%20Saya%20ingin%20bertanya%20mengenai%20booking%20kode%20${booking.booking_code}`}
                          target="_blank"
                          rel="noreferrer"
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 transition-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Hubungi Admin</span>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Lookup Success State Intro */}
      {!hasSearched && (
        <div className="text-center py-12 text-stone-400 space-y-3 bg-brand-100/20 rounded-2xl border border-dashed border-brand-200 p-8 max-w-2xl mx-auto">
          <FileText className="w-10 h-10 mx-auto text-brand-700 opacity-60 animate-bounce" />
          <p className="text-sm font-semibold text-brand-950">
            {lang === 'id' ? 'Cari Menggunakan Kontak Anda' : 'Search by Your Contacts'}
          </p>
          <p className="text-xs text-stone-500 max-w-md mx-auto leading-relaxed">
            {lang === 'id' 
              ? 'Masukkan nomor WhatsApp atau email yang Anda gunakan saat mendaftar booking di form depan untuk melacak status pembayaran.' 
              : 'Enter the WhatsApp number or email address used during booking submission to trace live room occupancy updates.'}
          </p>
        </div>
      )}

      {/* Invoice modal overlay */}
      {selectedInvoiceBooking && (
        <InvoicePDF
          booking={selectedInvoiceBooking}
          isOpen={selectedInvoiceBooking !== null}
          onClose={() => setSelectedInvoiceBooking(null)}
          lang={lang}
        />
      )}
    </div>
  );
}
