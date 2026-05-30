import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { authHeader, clearAuthSession, getAuthSession } from "../auth/session";
import logoImg from "../assets/logo.png";

import {
  ParsedWhatsAppQr,
  WhatsAppQrScanner,
} from "../components/WhatsAppQrScanner";
import { TicketPrinter, TicketReceipt } from "../components/TicketPrinter";

/* ──────────────────────── SVG Icons ──────────────────────── */
const Icons = {
  home: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v1m-14 0v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" /></svg>,
  building: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  users: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></svg>,
  history: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
  chart: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
  settings: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  logout: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
  refresh: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
  menu: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
};

type AdminAssistantPageProps = {
  establishmentName: string;
  establishmentId?: number | null;
};

type Tab = "creation" | "clients" | "calendar" | "validation" | "machines";

type Customer = {
  id: number;
  phone: string;
  first_name: string;
  last_name: string;
  role: string;
  date_joined: string;
};

type Resource = {
  id: number;
  label: string;
  status: "ACTIF" | "EN_PANNE";
  establishment_name: string;
};

type Booking = {
  id: number;
  booking_reference: string;
  user: number;
  user_phone: string;
  resource: number;
  resource_label: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: "EN_ATTENTE" | "PAYE" | "ANNULE";
  total_price: string;
  validated_by_phone?: string;
  validated_at?: string;
};

export function AdminAssistantPage({
  establishmentName,
  establishmentId,
}: AdminAssistantPageProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isArabic = i18n.language === "ar";
  const estId = establishmentId || 1;

  // Sidebar collapsed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Navigation (left sidebar menu)
  const [activeTab, setActiveTab] = useState<Tab>("creation");

  // expose a ref to control ticket preview printing
  const ticketPreviewRef = useRef<HTMLDivElement | null>(null);

  // Notifications
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setErrorMsg(null);
    window.setTimeout(() => setSuccessMsg(null), 4000);
  };

  const showError = (msg: string) => {
    setErrorMsg(msg);
    setSuccessMsg(null);
    window.setTimeout(() => setErrorMsg(null), 4000);
  };

  // Shared state triggers
  const [refreshCounter, setRefreshCounter] = useState(0);
  const triggerRefresh = () => setRefreshCounter((v) => v + 1);

  // Tab 1: Clients State (creation)
  const [searchClientQuery, setSearchClientQuery] = useState("");
  const [clients, setClients] = useState<Customer[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [creationStep, setCreationStep] = useState<"form" | "ticket">("form");
  const [createLastName, setCreateLastName] = useState("");
  const [createFirstName, setCreateFirstName] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createSecretCode, setCreateSecretCode] = useState("");
  const [creatingAccount, setCreatingAccount] = useState(false);

  // Tab 3: Calendar State
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    // Format YYYY-MM-DD in local timezone
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  });
  const [resources, setResources] = useState<Resource[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  // Manual booking creation
  const [selectedSlotForBooking, setSelectedSlotForBooking] = useState<{
    resource: Resource;
    time: string;
  } | null>(null);
  const [selectedClientForBooking, setSelectedClientForBooking] = useState<Customer | null>(null);
  const [bookingDuration, setBookingDuration] = useState<15 | 30 | 60>(30);
  const [searchClientForBooking, setSearchClientForBooking] = useState("");
  const [clientsForBookingResults, setClientsForBookingResults] = useState<Customer[]>([]);
  const [submittingBooking, setSubmittingBooking] = useState(false);

  // Quick Client Creation inside Modal
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickLastName, setQuickLastName] = useState("");
  const [quickFirstName, setQuickFirstName] = useState("");
  const [quickPhone, setQuickPhone] = useState("");
  const [quickSubmitting, setQuickSubmitting] = useState(false);

  // Tab 2: Validation & Scan State
  const [scanStatus, setScanStatus] = useState("idle");
  const [searchBookingQuery, setSearchBookingQuery] = useState("");
  const [foundBookings, setFoundBookings] = useState<Booking[]>([]);
  const [loadingFoundBookings, setLoadingFoundBookings] = useState(false);
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<Booking | null>(null);
  const [validationState, setValidationState] = useState<"idle" | "submitting">("idle");

  // Receipt Preview and Printing
  const [receiptData, setReceiptData] = useState<TicketReceipt | null>(null);
  const [printingBookingId, setPrintingBookingId] = useState<number | null>(null);

  // Tab 4: Machines State
  const [loadingMachines, setLoadingMachines] = useState(false);

  const session = getAuthSession();
  const userName = "Assistant";
  const userPhone = session?.phone || "0000000000";

  const handleLogout = () => {
    clearAuthSession();
    navigate("/staff/login", { replace: true });
  };

  // Helper date lists for direct selector (next 7 days)
  const quickDates = useMemo(() => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const value = `${year}-${month}-${day}`;

      let weekday = d.toLocaleDateString(i18n.language === "ar" ? "ar-DZ" : "fr-FR", {
        weekday: "short",
      });
      let label = d.toLocaleDateString(i18n.language === "ar" ? "ar-DZ" : "fr-FR", {
        day: "numeric",
        month: "short",
      });

      dates.push({ value, label, weekday });
    }
    return dates;
  }, [i18n.language]);

  // Load Resources & Bookings for Calendar & Machines tabs
  useEffect(() => {
    let active = true;
    async function loadData() {
      setLoadingCalendar(true);
      try {
        const headers = { ...authHeader() };
        const [resRes, bookRes] = await Promise.all([
          fetch(`/api/resources/?establishment_id=${estId}`, { headers }),
          fetch(`/api/bookings/?establishment_id=${estId}&date=${selectedDate}`, {
            headers,
          }),
        ]);

        if (resRes.ok && bookRes.ok && active) {
          const resData = await resRes.json();
          const bookData = await bookRes.json();
          setResources(resData);
          setBookings(bookData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoadingCalendar(false);
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, [estId, selectedDate, refreshCounter]);

  // Clients Tab search effect
  useEffect(() => {
    let active = true;
    if (activeTab !== "clients" && activeTab !== "calendar" && activeTab !== "creation") return;

    async function fetchClients() {
      setLoadingClients(true);
      try {
        const res = await fetch(
          `/api/users/?role=CUSTOMER&search=${encodeURIComponent(searchClientQuery)}`,
          { headers: authHeader() }
        );
        if (res.ok && active) {
          const data = await res.json();
          setClients(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoadingClients(false);
      }
    }

    const timer = setTimeout(fetchClients, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchClientQuery, activeTab, refreshCounter]);

  useEffect(() => {
    if (!createSecretCode) {
      setCreateSecretCode(String(Math.floor(100000 + Math.random() * 900000)));
    }
  }, [createSecretCode]);

  // Manual Booking client search effect
  useEffect(() => {
    let active = true;
    if (!selectedSlotForBooking) return;

    async function fetchClientsForBooking() {
      try {
        const res = await fetch(
          `/api/users/?role=CUSTOMER&search=${encodeURIComponent(searchClientForBooking)}`,
          { headers: authHeader() }
        );
        if (res.ok && active) {
          const data = await res.json();
          setClientsForBookingResults(data);
        }
      } catch (err) {
        console.error(err);
      }
    }

    const timer = setTimeout(fetchClientsForBooking, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchClientForBooking, selectedSlotForBooking]);

  // Validation search effect
  useEffect(() => {
    let active = true;
    if (activeTab !== "validation") return;
    if (!searchBookingQuery.trim()) {
      setFoundBookings([]);
      return;
    }

    async function fetchBookings() {
      setLoadingFoundBookings(true);
      try {
        const res = await fetch(`/api/bookings/?search=${encodeURIComponent(searchBookingQuery)}`, {
          headers: authHeader(),
        });
        if (res.ok && active) {
          const data = await res.json();
          setFoundBookings(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoadingFoundBookings(false);
      }
    }

    const timer = setTimeout(fetchBookings, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchBookingQuery, activeTab]);

  // Handle WhatsApp QR Scan
  const handleScan = (payload: ParsedWhatsAppQr) => {
    if (payload.kind === "booking-validation") {
      setSearchBookingQuery(payload.bookingId);
      setActiveTab("validation");
      showSuccess(t("scanDetected"));
    }
  };

  // Convert time string "HH:MM" or "HH:MM:SS" to minutes of day
  const timeToMinutes = (timeStr: string) => {
    const parts = timeStr.split(":");
    return Number(parts[0]) * 60 + Number(parts[1]);
  };

  // Generate 28 half-hour slots from 08:00 to 22:00
  const slots = useMemo(() => {
    const list = [];
    for (let m = 8 * 60; m < 22 * 60; m += 30) {
      const h = Math.floor(m / 60);
      const mins = m % 60;
      list.push(`${String(h).padStart(2, "0")}:${String(mins).padStart(2, "0")}`);
    }
    return list;
  }, []);

  // Add minutes helper
  const addMinutesToTime = (timeStr: string, mins: number): string => {
    const [h, m] = timeStr.split(":").map(Number);
    const total = h * 60 + m + mins;
    const newH = Math.floor(total / 60) % 24;
    const newM = total % 60;
    return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
  };

  // Save Manual Reservation
  const handleSaveManualBooking = async () => {
    if (!selectedSlotForBooking || !selectedClientForBooking) {
      showError(t("formRequired"));
      return;
    }

    setSubmittingBooking(true);
    try {
      const startTime = selectedSlotForBooking.time;
      const endTime = addMinutesToTime(startTime, bookingDuration);

      const payload = {
        resource: selectedSlotForBooking.resource.id,
        user: selectedClientForBooking.id,
        booking_date: selectedDate,
        start_time: startTime,
        end_time: endTime,
        status: "PAYE", // manually validation implies payment on-site
      };

      const res = await fetch("/api/bookings/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const createdBooking = await res.json();
        showSuccess(t("bookingSuccess"));
        setSelectedSlotForBooking(null);
        setSelectedClientForBooking(null);
        setSearchClientForBooking("");
        triggerRefresh();

        // Print receipt immediately
        handlePrintReceipt(createdBooking.id);
      } else {
        const errData = await res.json();
        showError(errData.detail || errData.resource?.[0] || t("bookingError"));
      }
    } catch (err) {
      showError(t("bookingError"));
    } finally {
      setSubmittingBooking(false);
    }
  };

  // Register client inside booking modal
  const handleQuickCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickLastName.trim() || !quickFirstName.trim() || !quickPhone.trim()) {
      showError(t("formRequired"));
      return;
    }

    setQuickSubmitting(true);
    try {
      // Auto-generate code
      const secret = String(Math.floor(100000 + Math.random() * 900000));
      const res = await fetch("/api/users/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
        body: JSON.stringify({
          phone: quickPhone.trim(),
          first_name: quickFirstName.trim(),
          last_name: quickLastName.trim(),
          secret_code: secret,
          role: "CUSTOMER",
          created_in_person: true,
        }),
      });

      if (res.ok) {
        const newCust = await res.json();
        showSuccess(t("newClient") + " créé !");
        setSelectedClientForBooking(newCust);
        setQuickCreateOpen(false);
        // Clear fields
        setQuickFirstName("");
        setQuickLastName("");
        setQuickPhone("");
        triggerRefresh();
      } else {
        const errData = await res.json();
        showError(errData.detail || errData.phone?.[0] || "Erreur lors de la création.");
      }
    } catch (err) {
      showError("Erreur de connexion.");
    } finally {
      setQuickSubmitting(false);
    }
  };

  // New: creation form submit handler for full page creation flow
  const handleCreateClientFromForm = async (payload: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
    secretCode: string;
  }) => {
    try {
      const res = await fetch("/api/users/", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader() },
        body: JSON.stringify({
          first_name: payload.firstName,
          last_name: payload.lastName,
          phone: payload.phoneNumber,
          secret_code: payload.secretCode,
          role: "CUSTOMER",
          created_in_person: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        showError(err.detail || "Erreur création client");
        return;
      }

      const created = await res.json();
      // Show ticket preview (use existing TicketPrinter via receiptData)
      // Fetch receipt for created user if backend provides booking-less receipt
      // We'll assemble a minimal receipt for preview
      const receipt: TicketReceipt = {
        bookingReference: "-",
        establishmentName: establishmentName,
        establishmentAddress: "",
        bookingDate: new Date().toISOString().slice(0, 10),
        startTime: new Date().toISOString().slice(11, 16),
        endTime: new Date().toISOString().slice(11, 16),
        clientFirstName: created.first_name,
        clientLastName: created.last_name,
        clientPhone: created.phone,
        secretCode: created.secret_code,
        totalPrice: "0",
        paymentStatus: "NOT_APPLICABLE",
        paymentStatusLabel: "",
        qrText: `LOGIN:${created.phone}:${created.secret_code}`,
        createdAt: new Date().toISOString(),
      };

      setReceiptData(receipt);
      setCreationStep("ticket");
      showSuccess("Client créé. Ticket prêt à imprimer.");
      triggerRefresh();
    } catch (err) {
      showError("Erreur lors de la création du client.");
    }
  };

  const regenerateSecretCode = () => {
    setCreateSecretCode(String(Math.floor(100000 + Math.random() * 900000)));
  };

  const handleCreateClientSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!createLastName.trim() || !createFirstName.trim() || !createPhone.trim() || !createSecretCode.trim()) {
      showError(t("formRequired"));
      return;
    }

    setCreatingAccount(true);
    try {
      await handleCreateClientFromForm({
        firstName: createFirstName.trim(),
        lastName: createLastName.trim(),
        phoneNumber: createPhone.trim(),
        secretCode: createSecretCode.trim(),
      });

      setCreateLastName("");
      setCreateFirstName("");
      setCreatePhone("");
      setCreateSecretCode(String(Math.floor(100000 + Math.random() * 900000)));
    } finally {
      setCreatingAccount(false);
    }
  };

  // Toggle machine status (ACTIF / EN_PANNE)
  const handleToggleMachine = async (machine: Resource) => {
    const nextStatus = machine.status === "ACTIF" ? "EN_PANNE" : "ACTIF";
    setLoadingMachines(true);
    try {
      const res = await fetch(`/api/resources/${machine.id}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.ok) {
        showSuccess(t("machineStatusUpdated"));
        triggerRefresh();
      } else {
        showError("Erreur de mise à jour.");
      }
    } catch (err) {
      showError("Erreur de réseau.");
    } finally {
      setLoadingMachines(false);
    }
  };

  // Validate Cash Payment
  const handleValidateCash = async (bookingId: number) => {
    setValidationState("submitting");
    try {
      const res = await fetch(`/api/bookings/${bookingId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
        body: JSON.stringify({ status: "PAYE" }),
      });

      if (res.ok) {
        showSuccess(t("validationSuccess"));
        // Update local found state
        setFoundBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: "PAYE" } : b))
        );
        if (selectedBookingDetails && selectedBookingDetails.id === bookingId) {
          setSelectedBookingDetails((prev) => (prev ? { ...prev, status: "PAYE" } : null));
        }
        triggerRefresh();
        // Print receipt
        handlePrintReceipt(bookingId);
      } else {
        showError("Impossible de valider.");
      }
    } catch (err) {
      showError("Erreur.");
    } finally {
      setValidationState("submitting");
    }
  };

  // Cancel Booking
  const handleCancelBooking = async (bookingId: number) => {
    if (!window.confirm("Voulez-vous annuler cette réservation ?")) return;
    setValidationState("submitting");
    try {
      const res = await fetch(`/api/bookings/${bookingId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
        body: JSON.stringify({ status: "ANNULE" }),
      });

      if (res.ok) {
        showSuccess(t("cancellationSuccess"));
        setFoundBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: "ANNULE" } : b))
        );
        if (selectedBookingDetails && selectedBookingDetails.id === bookingId) {
          setSelectedBookingDetails((prev) => (prev ? { ...prev, status: "ANNULE" } : null));
        }
        triggerRefresh();
      } else {
        showError("Erreur d'annulation.");
      }
    } catch (err) {
      showError("Erreur.");
    } finally {
      setValidationState("submitting");
    }
  };

  // Fetch Receipt information and print
  const handlePrintReceipt = async (bookingId: number) => {
    setPrintingBookingId(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/receipt/`, {
        headers: authHeader(),
      });
      if (res.ok) {
        const data = await res.json();
        setReceiptData({
          bookingReference: data.booking_reference,
          establishmentName: data.establishment_name,
          establishmentAddress: data.establishment_address,
          bookingDate: data.booking_date,
          startTime: data.start_time.slice(0, 5),
          endTime: data.end_time.slice(0, 5),
          clientFirstName: data.client_first_name,
          clientLastName: data.client_last_name,
          clientPhone: data.client_phone,
          secretCode: data.secret_code,
          totalPrice: data.total_price,
          paymentStatus: data.payment_status,
          paymentStatusLabel: data.payment_status_label,
          qrText: data.qr_text,
          createdAt: data.created_at,
        });

        // Small delay to let the print markup render
        window.setTimeout(() => {
          window.print();
        }, 150);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPrintingBookingId(null);
    }
  };

  /* ── Sidebar Tabs Config ── */
  const tabs: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
    { key: "creation", label: "Création client", icon: Icons.users },
    { key: "validation", label: "Validation rendez-vous", icon: Icons.history },
    { key: "calendar", label: "Calendrier", icon: Icons.chart },
    { key: "machines", label: "Machines", icon: Icons.settings },
  ];

  return (
    <div dir={isArabic ? "rtl" : "ltr"} className="flex h-screen w-screen overflow-hidden bg-gradient-to-br from-slate-50 via-sky-50/30 to-white">
      {/* ── Sidebar ── */}
      <aside className={`
        fixed inset-y-0 z-40 flex w-72 flex-col bg-white/80 backdrop-blur-xl border-r border-sky-100/60
        shadow-[4px_0_30px_rgba(14,165,233,0.06)] transition-transform duration-300 lg:relative lg:translate-x-0
        ${isArabic ? "right-0 border-l border-r-0" : "left-0"}
        ${sidebarOpen ? "translate-x-0" : (isArabic ? "translate-x-full lg:translate-x-0" : "-translate-x-full lg:translate-x-0")}
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-sky-100/40">
          <img src={logoImg} alt="Logo" className="h-10 w-auto" />
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-900">Chrono.dz</h1>
            <p className="text-[10px] font-semibold text-sky-600 uppercase tracking-[0.2em]">{t("assistantSpace")}</p>
          </div>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => { setActiveTab(tab.key); setSidebarOpen(false); }}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 cursor-pointer
                ${activeTab === tab.key
                  ? "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-lg shadow-sky-200/50"
                  : "text-slate-600 hover:bg-sky-50 hover:text-slate-900"
                }
              `}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Bottom User + Logout */}
        <div className="border-t border-sky-100/40 px-4 py-4 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold shadow">
              {session?.phone?.slice(-2) || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{userName}</p>
              <p className="text-[10px] text-slate-400 font-medium">{userPhone}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border border-rose-100 bg-rose-50/60 text-rose-600 text-sm font-semibold hover:bg-rose-100 transition cursor-pointer"
          >
            {Icons.logout}
            <span>{t("logout")}</span>
          </button>
        </div>
      </aside>

      {/* ── Overlay for mobile sidebar ── */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-900/20 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* ── Main Content Area ── */}
      <main className="flex-1 overflow-y-auto">
        {/* Top Bar identical to Super Admin */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-4 bg-white/70 backdrop-blur-xl border-b border-sky-100/40 px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden rounded-xl p-2 bg-sky-50 text-sky-700 hover:bg-sky-100 transition cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                {establishmentName}
              </h2>
              <p className="text-xs font-medium text-slate-500 mt-0.5">
                 {t("assistantSubtitle")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={triggerRefresh}
              className="flex items-center gap-2 rounded-2xl border border-sky-100 bg-sky-50/60 px-4 py-2.5 text-sm font-semibold text-sky-700 hover:bg-sky-100 transition cursor-pointer"
            >
              {Icons.refresh}
              <span className="hidden sm:inline">{t("refresh")}</span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          {/* ── Notification Banner ── */}
          {successMsg && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-emerald-800 text-sm font-semibold flex items-center gap-2 shadow-sm">
              ✅ {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="rounded-xl bg-rose-50 border border-rose-100 p-4 text-rose-800 text-sm font-semibold flex items-center gap-2 shadow-sm">
              ⚠️ {errorMsg}
            </div>
          )}

          {/* ── Main Tab Contents ── */}
          <div className="bg-white/60 rounded-[2rem] border border-sky-100/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl p-6 sm:p-8">
        {/* 1. CALENDAR TAB */}
        {activeTab === "calendar" && (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{t("calendarTab")}</h3>
                <p className="text-xs text-slate-500">Visualisez et réservez les machines en direct.</p>
              </div>

              {/* Date Quick Selector */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
                {quickDates.map((qd) => (
                  <button
                    key={qd.value}
                    type="button"
                    onClick={() => setSelectedDate(qd.value)}
                    className={`rounded-xl px-3 py-2 text-center text-xs font-semibold transition-all ${
                      selectedDate === qd.value
                        ? "bg-sky-600 text-white shadow-md shadow-sky-100"
                        : "bg-sky-50 text-slate-600 hover:bg-sky-100"
                    }`}
                  >
                    <div className="uppercase opacity-75">{qd.weekday}</div>
                    <div className="mt-0.5">{qd.label}</div>
                  </button>
                ))}
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="rounded-xl border border-sky-100 bg-sky-50 px-3 py-3 text-xs font-semibold text-slate-700 outline-none"
                />
              </div>
            </div>

            {loadingCalendar ? (
              <div className="py-20 text-center text-slate-500 font-semibold">{t("loading")}</div>
            ) : resources.length === 0 ? (
              <div className="rounded-3xl border border-sky-100 bg-sky-50/50 p-12 text-center text-slate-500">
                Aucun poste configuré pour cet établissement.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-3xl border border-sky-100 bg-white">
                <table className="w-full border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-sky-50/60 border-b border-sky-100">
                      <th className="p-4 font-bold text-slate-700 w-24">Heure</th>
                      {resources.map((res) => (
                        <th key={res.id} className="p-4 font-bold text-slate-800 text-center min-w-[150px]">
                          <div className="flex flex-col items-center">
                            <span>{res.label}</span>
                            <span
                              className={`mt-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                res.status === "ACTIF"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {res.status === "ACTIF" ? "Actif" : "En panne"}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {slots.map((time) => {
                      const slotMins = timeToMinutes(time);
                      return (
                        <tr key={time} className="border-b border-sky-50 hover:bg-slate-50/40">
                          <td className="p-4 font-bold text-slate-600 bg-slate-50/20">{time}</td>
                          {resources.map((res) => {
                            // If machine is broken
                            if (res.status === "EN_PANNE") {
                              return (
                                <td
                                  key={res.id}
                                  className="p-2 text-center text-xs font-semibold text-rose-700 bg-rose-50/30"
                                >
                                  Hors service
                                </td>
                              );
                            }

                            // Look for booking in slot [slotMins, slotMins + 30]
                            const activeBooking = bookings.find((b) => {
                              if (b.status === "ANNULE") return false;
                              if (b.resource !== res.id) return false;
                              const bStart = timeToMinutes(b.start_time);
                              const bEnd = timeToMinutes(b.end_time);
                              return bStart < slotMins + 30 && bEnd > slotMins;
                            });

                            if (activeBooking) {
                              const isPaid = activeBooking.status === "PAYE";
                              return (
                                <td key={res.id} className="p-2">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedBookingDetails(activeBooking)}
                                    className={`w-full rounded-2xl p-2 text-left text-xs font-medium border transition hover:shadow-md cursor-pointer ${
                                      isPaid
                                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                        : "bg-amber-50 border-amber-200 text-amber-800"
                                    }`}
                                  >
                                    <div className="font-bold flex items-center justify-between">
                                      <span>{activeBooking.user_phone}</span>
                                      <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-white/70">
                                        {isPaid ? "Payé" : "En attente"}
                                      </span>
                                    </div>
                                    <div className="opacity-80 mt-1 truncate">
                                      {activeBooking.booking_reference}
                                    </div>
                                  </button>
                                </td>
                              );
                            }

                            // Free slot
                            return (
                              <td key={res.id} className="p-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setSelectedSlotForBooking({ resource: res, time })
                                  }
                                  className="w-full rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/10 py-3 text-center text-emerald-600 font-bold hover:bg-emerald-50/60 hover:-translate-y-0.5 transition cursor-pointer"
                                >
                                  + Réserver
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 2. CREATION TAB */}
        {activeTab === "creation" && (
          <div className="space-y-6">
            {creationStep === "form" ? (
              <>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Créer un Compte Client</h3>
                  <p className="text-xs text-slate-500 mt-1">Saisissez uniquement les informations du client puis créez le compte.</p>
                </div>

                <div className="rounded-2xl border border-sky-100 bg-white p-5 space-y-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Recherche client manuelle
                    <input
                      type="text"
                      value={searchClientQuery}
                      onChange={(e) => setSearchClientQuery(e.target.value)}
                      placeholder={t("searchClients")}
                      className="mt-2 w-full rounded-2xl border border-sky-100 bg-sky-50/40 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white"
                    />
                  </label>

                  {searchClientQuery.trim() ? (
                    loadingClients ? (
                      <div className="text-xs text-slate-500">{t("loading")}</div>
                    ) : clients.length === 0 ? (
                      <div className="text-xs text-slate-400">{t("noClientsFound")}</div>
                    ) : (
                      <div className="max-h-44 overflow-y-auto rounded-xl border border-sky-100 divide-y divide-sky-50">
                        {clients.map((c) => (
                          <div key={c.id} className="px-3 py-2 text-xs flex items-center justify-between gap-3">
                            <span className="font-semibold text-slate-700">{c.first_name} {c.last_name}</span>
                            <span className="text-slate-500">{c.phone}</span>
                          </div>
                        ))}
                      </div>
                    )
                  ) : null}
                </div>

                <form onSubmit={handleCreateClientSubmit} className="rounded-2xl border border-sky-100 bg-white p-5 sm:p-6 space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-semibold text-slate-700">
                      Nom
                      <input
                        type="text"
                        value={createLastName}
                        onChange={(e) => setCreateLastName(e.target.value)}
                        className="mt-1.5 w-full rounded-2xl border border-sky-100 bg-sky-50/30 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                        required
                      />
                    </label>

                    <label className="block text-sm font-semibold text-slate-700">
                      Prénom
                      <input
                        type="text"
                        value={createFirstName}
                        onChange={(e) => setCreateFirstName(e.target.value)}
                        className="mt-1.5 w-full rounded-2xl border border-sky-100 bg-sky-50/30 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                        required
                      />
                    </label>
                  </div>

                  <label className="block text-sm font-semibold text-slate-700">
                    Numéro de téléphone
                    <input
                      type="text"
                      value={createPhone}
                      onChange={(e) => setCreatePhone(e.target.value)}
                      className="mt-1.5 w-full rounded-2xl border border-sky-100 bg-sky-50/30 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white"
                      required
                    />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                    <label className="block text-sm font-semibold text-slate-700">
                      Code secret
                      <input
                        type="text"
                        value={createSecretCode}
                        onChange={(e) => setCreateSecretCode(e.target.value)}
                        className="mt-1.5 w-full rounded-2xl border border-sky-100 bg-sky-50/30 px-4 py-3 outline-none transition focus:border-sky-400 focus:bg-white tracking-[0.2em]"
                        maxLength={6}
                        required
                      />
                    </label>

                    <button
                      type="button"
                      onClick={regenerateSecretCode}
                      className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700 hover:bg-sky-100 transition cursor-pointer"
                    >
                      Régénérer code secret
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={creatingAccount}
                    className="w-full rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold py-3.5 text-sm transition shadow-lg shadow-sky-100 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {creatingAccount ? "Création..." : "Créer compte"}
                  </button>
                </form>
              </>
            ) : (
              <div className="rounded-3xl border border-sky-100 bg-white p-6 sm:p-8 space-y-6" ref={ticketPreviewRef}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Aperçu du ticket</h3>
                    <p className="text-xs text-slate-500 mt-1">Vérifiez les informations puis imprimez le ticket.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCreationStep("form");
                      setReceiptData(null);
                    }}
                    className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100 transition cursor-pointer"
                  >
                    Nouveau compte
                  </button>
                </div>

                {receiptData ? (
                  <TicketPrinter receipt={receiptData} showPrintButton title="Ticket de création de compte" />
                ) : null}
              </div>
            )}
          </div>
        )}

        {activeTab === "clients" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900">{t("clientList")}</h3>
              <p className="text-xs text-slate-500">Recherche de compte en direct.</p>
            </div>

            <div className="relative">
              <input
                type="text"
                value={searchClientQuery}
                onChange={(e) => setSearchClientQuery(e.target.value)}
                placeholder={t("searchClients")}
                className="w-full rounded-2xl border border-sky-100 bg-sky-50/40 px-4 py-3.5 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white"
              />
            </div>

            {loadingClients ? (
              <div className="py-10 text-center text-slate-500">{t("loading")}</div>
            ) : clients.length === 0 ? (
              <div className="text-slate-400 text-center py-10 bg-sky-50/20 rounded-2xl border border-dashed border-sky-100">
                {t("noClientsFound")}
              </div>
            ) : (
              <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2">
                {clients.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-sky-50 bg-white hover:bg-sky-50/30 transition hover:shadow-sm"
                  >
                    <div>
                      <p className="font-bold text-slate-900">
                        {c.first_name} {c.last_name}
                      </p>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">{c.phone}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedClientForBooking(c);
                        if (resources.length > 0) {
                          setSelectedSlotForBooking({
                            resource: resources[0],
                            time: "08:00",
                          });
                          setActiveTab("calendar");
                        } else {
                          showError("Aucun poste configuré pour réserver.");
                        }
                      }}
                      className="rounded-xl bg-sky-50 hover:bg-sky-100 px-4 py-2 text-xs font-bold text-sky-700 transition cursor-pointer"
                    >
                      Réserver
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. VALIDATION & SCAN TAB */}
        {activeTab === "validation" && (
          <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
            {/* WhatsApp Scanner */}
            <div className="space-y-6 border-r border-sky-100 pr-0 lg:pr-8">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{t("qrScanner")}</h3>
                <p className="text-xs text-slate-500">{t("cameraInstructions")}</p>
              </div>

              <WhatsAppQrScanner
                onStatusChange={setScanStatus}
                onScan={handleScan}
              />
            </div>

            {/* Manual lookup and Details */}
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Validation Manuelle</h3>
                <p className="text-xs text-slate-500">Recherchez par téléphone ou référence.</p>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={searchBookingQuery}
                  onChange={(e) => setSearchBookingQuery(e.target.value)}
                  placeholder={t("searchBooking")}
                  className="w-full rounded-2xl border border-sky-100 bg-sky-50/40 px-4 py-3.5 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white"
                />
              </div>

              {loadingFoundBookings ? (
                <div className="py-6 text-center text-slate-400">{t("loading")}</div>
              ) : foundBookings.length > 0 ? (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                  {foundBookings.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setSelectedBookingDetails(b)}
                      className={`w-full text-left p-4 rounded-2xl border transition flex items-center justify-between hover:shadow-sm ${
                        selectedBookingDetails?.id === b.id
                          ? "border-sky-500 bg-sky-50/30"
                          : "border-sky-50 bg-white"
                      }`}
                    >
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <span>{b.booking_reference}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              b.status === "PAYE"
                                ? "bg-emerald-100 text-emerald-800"
                                : b.status === "ANNULE"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {b.status === "PAYE" ? "Payé" : b.status === "ANNULE" ? "Annulé" : "En attente"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Client: {b.user_phone} • Machine: {b.resource_label}
                        </p>
                      </div>
                      <span className="text-sky-500 font-bold">→</span>
                    </button>
                  ))}
                </div>
              ) : searchBookingQuery.trim() ? (
                <p className="text-center text-xs text-slate-400 py-6">{t("noBookingsFound")}</p>
              ) : null}

              {/* Selected Booking detail panel */}
              {selectedBookingDetails && (
                <div className="rounded-3xl border border-sky-100 bg-sky-50/40 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-900 text-sm">
                      Détails de {selectedBookingDetails.booking_reference}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setSelectedBookingDetails(null)}
                      className="text-xs font-bold text-slate-400 hover:text-slate-600"
                    >
                      Fermer
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-white p-3 rounded-xl border border-sky-50">
                      <span className="text-slate-400 block uppercase font-bold tracking-wider text-[10px]">
                        Client
                      </span>
                      <span className="font-bold text-slate-800 block mt-1">
                        {selectedBookingDetails.user_phone}
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-sky-50">
                      <span className="text-slate-400 block uppercase font-bold tracking-wider text-[10px]">
                        Poste / Machine
                      </span>
                      <span className="font-bold text-slate-800 block mt-1">
                        {selectedBookingDetails.resource_label}
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-sky-50">
                      <span className="text-slate-400 block uppercase font-bold tracking-wider text-[10px]">
                        Date & Horaire
                      </span>
                      <span className="font-bold text-slate-800 block mt-1">
                        {selectedBookingDetails.booking_date} (
                        {selectedBookingDetails.start_time.slice(0, 5)} -{" "}
                        {selectedBookingDetails.end_time.slice(0, 5)})
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-sky-50">
                      <span className="text-slate-400 block uppercase font-bold tracking-wider text-[10px]">
                        Montant
                      </span>
                      <span className="font-bold text-slate-800 block mt-1">
                        {selectedBookingDetails.total_price} DA
                      </span>
                    </div>
                  </div>

                  {/* Actions on booking */}
                  <div className="flex gap-2 flex-wrap">
                    {selectedBookingDetails.status === "EN_ATTENTE" && (
                      <button
                        type="button"
                        onClick={() => handleValidateCash(selectedBookingDetails.id)}
                        className="flex-1 min-w-[140px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 text-xs transition shadow-md shadow-emerald-100 cursor-pointer"
                      >
                        {t("paymentCash")}
                      </button>
                    )}

                    {selectedBookingDetails.status !== "ANNULE" && (
                      <button
                        type="button"
                        onClick={() => handleCancelBooking(selectedBookingDetails.id)}
                        className="rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold py-3 px-4 text-xs transition cursor-pointer"
                      >
                        {t("cancelBooking")}
                      </button>
                    )}

                    {selectedBookingDetails.status === "PAYE" && (
                      <button
                        type="button"
                        disabled={printingBookingId !== null}
                        onClick={() => handlePrintReceipt(selectedBookingDetails.id)}
                        className="flex-1 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 text-xs transition cursor-pointer"
                      >
                        {printingBookingId === selectedBookingDetails.id
                          ? "Impression..."
                          : "Imprimer Ticket"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. MACHINES TAB */}
        {activeTab === "machines" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-bold text-slate-900">{t("machinesTitle")}</h3>
              <p className="text-xs text-slate-500">{t("machinesSubtitle")}</p>
            </div>

            {loadingCalendar ? (
              <div className="py-10 text-center text-slate-500">{t("loading")}</div>
            ) : resources.length === 0 ? (
              <div className="text-slate-400 text-center py-10 bg-sky-50/20 rounded-2xl">
                Aucune machine enregistrée.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {resources.map((res) => {
                  const isActive = res.status === "ACTIF";
                  return (
                    <div
                      key={res.id}
                      className={`rounded-3xl border p-5 flex flex-col justify-between gap-4 transition hover:shadow-md ${
                        isActive ? "border-sky-100 bg-white" : "border-rose-100 bg-rose-50/20"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-slate-900 text-base">{res.label}</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-0.5">ID: {res.id}</p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                            isActive
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800 animate-pulse"
                          }`}
                        >
                          {isActive ? "Actif" : "En panne"}
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={loadingMachines}
                        onClick={() => handleToggleMachine(res)}
                        className={`w-full rounded-2xl py-2.5 text-xs font-bold transition cursor-pointer ${
                          isActive
                            ? "bg-rose-50 hover:bg-rose-100 text-rose-700"
                            : "bg-sky-50 hover:bg-sky-100 text-sky-700"
                        }`}
                      >
                        {isActive ? t("reportBroken") : t("setMachineActive")}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Manual Booking Creation Modal ── */}
      {selectedSlotForBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[2rem] border border-sky-100 bg-white p-6 shadow-2xl text-slate-900">
            <div className="flex items-center justify-between border-b border-sky-50 pb-4 mb-4">
              <div>
                <h4 className="text-lg font-bold text-slate-900">Nouvelle Réservation Manuelle</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedSlotForBooking.resource.label} • {selectedSlotForBooking.time} •{" "}
                  {selectedDate}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedSlotForBooking(null);
                  setSelectedClientForBooking(null);
                  setSearchClientForBooking("");
                  setQuickCreateOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Quick Register New Client Panel (Toggle inside Modal) */}
            {quickCreateOpen ? (
              <form onSubmit={handleQuickCreateClient} className="space-y-4">
                <div className="flex justify-between items-center">
                  <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Création rapide client
                  </h5>
                  <button
                    type="button"
                    onClick={() => setQuickCreateOpen(false)}
                    className="text-xs text-sky-600 hover:underline cursor-pointer"
                  >
                    Retour à la recherche
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-semibold text-slate-600">
                    Nom
                    <input
                      type="text"
                      required
                      value={quickLastName}
                      onChange={(e) => setQuickLastName(e.target.value)}
                      placeholder="Nom"
                      className="w-full mt-1 rounded-xl border border-sky-50 bg-sky-50/40 px-3 py-2 text-slate-900 outline-none"
                    />
                  </label>
                  <label className="block text-xs font-semibold text-slate-600">
                    Prénom
                    <input
                      type="text"
                      required
                      value={quickFirstName}
                      onChange={(e) => setQuickFirstName(e.target.value)}
                      placeholder="Prénom"
                      className="w-full mt-1 rounded-xl border border-sky-50 bg-sky-50/40 px-3 py-2 text-slate-900 outline-none"
                    />
                  </label>
                </div>
                <label className="block text-xs font-semibold text-slate-600">
                  Téléphone
                  <input
                    type="text"
                    required
                    value={quickPhone}
                    onChange={(e) => setQuickPhone(e.target.value)}
                    placeholder="07XXXXXXXX"
                    className="w-full mt-1 rounded-xl border border-sky-50 bg-sky-50/40 px-3 py-2 text-slate-900 outline-none"
                  />
                </label>

                <button
                  type="submit"
                  disabled={quickSubmitting}
                  className="w-full rounded-2xl bg-sky-600 text-white font-bold py-2.5 text-xs transition cursor-pointer"
                >
                  {quickSubmitting ? "Création..." : "Créer le client"}
                </button>
              </form>
            ) : (
              <div className="space-y-4">
                {/* Client Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {t("selectClientForBooking")}
                  </label>
                  {selectedClientForBooking ? (
                    <div className="mt-2 flex items-center justify-between p-3 rounded-2xl bg-emerald-50 border border-emerald-100">
                      <div>
                        <p className="font-bold text-emerald-950 text-sm">
                          {selectedClientForBooking.first_name} {selectedClientForBooking.last_name}
                        </p>
                        <p className="text-xs text-emerald-800">{selectedClientForBooking.phone}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedClientForBooking(null)}
                        className="text-xs font-bold text-sky-700 hover:underline cursor-pointer"
                      >
                        Modifier
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2 items-center mt-2">
                        <input
                          type="text"
                          value={searchClientForBooking}
                          onChange={(e) => setSearchClientForBooking(e.target.value)}
                          placeholder="Rechercher par nom ou numéro..."
                          className="w-full rounded-2xl border border-sky-50 bg-sky-50/40 px-4 py-2.5 text-xs outline-none focus:bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => setQuickCreateOpen(true)}
                          className="rounded-2xl border border-sky-100 bg-sky-50 px-3 py-2.5 text-xs font-bold text-sky-700 hover:bg-sky-100 transition whitespace-nowrap cursor-pointer"
                        >
                          + Nouveau
                        </button>
                      </div>

                      {/* Dropdown list of results */}
                      {searchClientForBooking && (
                        <div className="border border-sky-50 rounded-2xl bg-white max-h-[150px] overflow-y-auto divide-y divide-sky-50 shadow-sm text-xs">
                          {clientsForBookingResults.length === 0 ? (
                            <p className="p-3 text-slate-400 text-center">Aucun client trouvé.</p>
                          ) : (
                            clientsForBookingResults.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => setSelectedClientForBooking(c)}
                                className="w-full text-left p-3 hover:bg-sky-50/50 transition flex justify-between items-center cursor-pointer"
                              >
                                <span className="font-bold text-slate-800">
                                  {c.first_name} {c.last_name}
                                </span>
                                <span className="text-slate-400 font-semibold">{c.phone}</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {t("durationLabel")}
                  </label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {([15, 30, 60] as const).map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setBookingDuration(dur)}
                        className={`rounded-2xl border py-2.5 text-xs font-bold transition ${
                          bookingDuration === dur
                            ? "border-sky-600 bg-sky-600 text-white"
                            : "border-sky-50 bg-sky-50/30 text-slate-600 hover:bg-sky-50"
                        }`}
                      >
                        {dur} min
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pricing Summary */}
                <div className="bg-sky-50/40 border border-sky-100 p-4 rounded-2xl text-xs flex justify-between items-center">
                  <div>
                    <span className="text-slate-500 font-bold block">Prix total</span>
                    <span className="text-slate-400 mt-0.5 block font-medium">Tarif: 15 DA / min</span>
                  </div>
                  <span className="text-lg font-extrabold text-slate-900">
                    {bookingDuration * 15} DA
                  </span>
                </div>

                {/* Submit */}
                <button
                  type="button"
                  disabled={submittingBooking || !selectedClientForBooking}
                  onClick={handleSaveManualBooking}
                  className="w-full rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold py-3.5 text-xs transition shadow-lg shadow-sky-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {submittingBooking ? "Enregistrement..." : t("saveBooking")}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
        </div>
      </main>
    </div>
  );
}

// Minimal Components
type TabButtonProps = {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: string;
};

function TabButton({ active, onClick, label, icon }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold transition whitespace-nowrap cursor-pointer ${
        active
          ? "bg-sky-600 text-white shadow-md shadow-sky-100"
          : "text-slate-600 hover:bg-sky-50 hover:text-slate-900"
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  );
}