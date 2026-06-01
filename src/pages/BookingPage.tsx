import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import { authHeader, clearAuthSession, getAuthSession } from "../auth/session";
import { LANGUAGE_STORAGE_KEY, type AppLanguage } from "../i18n";
import logoImg from "../assets/logo.png";

type BookingPageProps = {
  language: AppLanguage;
  phoneNumber?: string;
};

type WashModeKey = "rapid" | "express" | "premium" | "vip";
type WizardStep = "mode" | "calendar" | "time";
type DashboardTab = "myBookings" | "newBooking";

type WashMode = {
  key: WashModeKey;
  label: string;
  duration: number;
  pricePerMinute: number;
  accent: string;
  description: string;
};

type BookingRecord = {
  id: number;
  booking_reference: string;
  resource: number;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: "EN_ATTENTE" | "PAYE" | "ANNULE" | string;
  total_price: string;
  resource_label: string;
  establishment_name: string;
};

type TimeSlot = {
  start_time: string;
  end_time: string;
  reserved_resources: number;
  total_resources: number;
  available_resources: number;
  status: "AVAILABLE" | "FULL" | "CLOSED";
  status_label: string;
  color: string;
};

type DayAvailability = {
  date: string;
  label: string;
  weekday: string;
  slots: TimeSlot[];
  opening_time: string;
  closing_time: string;
  total_resources: number;
  availableCount: number;
  fullCount: number;
  isAvailable: boolean;
};

type ConfirmationDraft = {
  booking_date: string;
  start_time: string;
  end_time: string;
  total_price: string;
  modeLabel: string;
  modeKey?: string;
  bookingStatus?: string;
  paymentMethod: "cash" | "baridimob";
  clientName: string;
  establishmentName: string;
  establishmentAddress: string;
  bookingId: number | null;
};

function loadBookingResumeDraft(state: unknown): ConfirmationDraft | null {
  if (state && typeof state === "object") {
    const candidate = state as Partial<ConfirmationDraft>;
    if (
      typeof candidate.booking_date === "string" &&
      typeof candidate.start_time === "string" &&
      typeof candidate.end_time === "string" &&
      typeof candidate.total_price === "string" &&
      typeof candidate.modeLabel === "string" &&
      typeof candidate.clientName === "string" &&
      typeof candidate.establishmentName === "string" &&
      typeof candidate.establishmentAddress === "string" &&
      (candidate.bookingId === null || typeof candidate.bookingId === "number")
    ) {
      return {
        ...candidate,
        paymentMethod: candidate.paymentMethod === "baridimob" ? "baridimob" : "cash",
      } as ConfirmationDraft;
    }
  }

  return null;
}

function getModeKeyFromDraft(draft: ConfirmationDraft | null): WashModeKey | null {
  if (!draft) {
    return null;
  }

  if (draft.modeKey === "rapid" || draft.modeKey === "express" || draft.modeKey === "premium" || draft.modeKey === "vip") {
    return draft.modeKey;
  }

  const matchedMode = WASH_MODES.find((mode) => mode.label === draft.modeLabel);
  return matchedMode?.key ?? null;
}

const PRICE_PER_MINUTE = 15;
const DAY_COUNT = 30;
const SLOT_STEP_MINUTES = 15;
const OPEN_MINUTES = 8 * 60;
const CLOSE_MINUTES = 22 * 60;

const WASH_MODES: WashMode[] = [
  {
    key: "rapid",
    label: "Rapide",
    duration: 15,
    pricePerMinute: PRICE_PER_MINUTE,
    accent: "from-cyan-500 to-sky-600",
    description: "Cycle court et efficace pour un nettoyage rapide.",
  },
  {
    key: "express",
    label: "Express",
    duration: 30,
    pricePerMinute: PRICE_PER_MINUTE,
    accent: "from-sky-500 to-blue-600",
    description: "Le meilleur équilibre entre vitesse et résultat.",
  },
  {
    key: "premium",
    label: "Premium",
    duration: 45,
    pricePerMinute: PRICE_PER_MINUTE,
    accent: "from-blue-500 to-indigo-600",
    description: "Traitement approfondi avec un temps plus confortable.",
  },
  {
    key: "vip",
    label: "VIP",
    duration: 60,
    pricePerMinute: PRICE_PER_MINUTE,
    accent: "from-slate-900 to-slate-700",
    description: "Le cycle le plus complet pour un rendu maximal.",
  },
];

const BOOKING_STEP_PATHS: Record<WizardStep, string> = {
  mode: "/appointments/mode",
  calendar: "/appointments/calendar",
  time: "/appointments/time",
};

function getModeByKey(modeKey: WashModeKey | null) {
  return WASH_MODES.find((mode) => mode.key === modeKey) ?? WASH_MODES[1];
}

function getModeByDuration(durationMinutes: number) {
  return WASH_MODES.find((mode) => mode.duration === durationMinutes) ?? WASH_MODES[1];
}

function getWizardStepFromPath(pathname: string): WizardStep {
  if (pathname.includes("/time")) {
    return "time";
  }

  if (pathname.includes("/calendar")) {
    return "calendar";
  }

  return "mode";
}

function isBookingPath(pathname: string) {
  return pathname === "/appointments" || pathname.startsWith("/appointments/");
}

function isDashboardHomePath(pathname: string) {
  return pathname === "/appointments" || pathname === "/appointments/";
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTimeKey(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function addMinutesToTime(timeValue: string, minutesToAdd: number) {
  const [hours, minutes] = timeValue.split(":").map(Number);
  const total = hours * 60 + minutes + minutesToAdd;
  return formatTimeKey(total);
}

function isValidTimeValue(timeValue: string) {
  return /^\d{2}:\d{2}$/.test(timeValue);
}

function dateToLabel(dateValue: string, language: AppLanguage) {
  const current = new Date(`${dateValue}T12:00:00`);
  return new Intl.DateTimeFormat(language === "ar" ? "ar-DZ" : "fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(current);
}

function dateToLongLabel(dateValue: string, language: AppLanguage) {
  const current = new Date(`${dateValue}T12:00:00`);
  return new Intl.DateTimeFormat(language === "ar" ? "ar-DZ" : "fr-FR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(current);
}

function getNextDates(count: number) {
  const dates: string[] = [];
  const today = new Date();

  for (let index = 0; index < count; index += 1) {
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + index);
    dates.push(formatDateKey(nextDate));
  }

  return dates;
}

function getMinutesFromTime(timeValue: string) {
  const [hours, minutes] = timeValue.split(":").map(Number);
  return hours * 60 + minutes;
}

function getVisibleSlots(dayAvailability: DayAvailability | undefined) {
  return [...(dayAvailability?.slots ?? [])].sort((left, right) => left.start_time.localeCompare(right.start_time));
}

function filterTodaySlotsWithLeadTime(dateValue: string, slots: TimeSlot[], leadMinutes = 30) {
  const todayKey = formatDateKey(new Date());
  if (dateValue !== todayKey) {
    return slots;
  }

  const now = new Date();
  const minStartMinutes = now.getHours() * 60 + now.getMinutes() + leadMinutes;

  return slots.filter((slot) => getMinutesFromTime(slot.start_time) >= minStartMinutes);
}

function buildDayAvailability(dateValue: string, apiResponse: any, language: AppLanguage): DayAvailability {
  const rawSlots: TimeSlot[] = Array.isArray(apiResponse?.slots) ? apiResponse.slots : [];
  const slots = filterTodaySlotsWithLeadTime(dateValue, rawSlots, 30);
  const availableCount = slots.filter((slot) => slot.status === "AVAILABLE").length;
  const fullCount = slots.filter((slot) => slot.status === "FULL").length;

  return {
    date: dateValue,
    label: dateToLabel(dateValue, language),
    weekday: dateToLabel(dateValue, language).split(" ")[0],
    slots,
    opening_time: apiResponse?.opening_time ?? "08:00",
    closing_time: apiResponse?.closing_time ?? "22:00",
    total_resources: apiResponse?.total_resources ?? 0,
    availableCount,
    fullCount,
    isAvailable: availableCount > 0,
  };
}

function getSlotClass(slot: TimeSlot, selected = false) {
  if (selected) {
    return "border-sky-600 bg-sky-600 text-white shadow-[0_14px_40px_rgba(14,165,233,0.28)]";
  }

  if (slot.status === "AVAILABLE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100";
  }

  if (slot.status === "FULL") {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }

  return "border-slate-200 bg-slate-100 text-slate-500";
}

function getDayCardClass(day: DayAvailability) {
  return day.isAvailable
    ? "border-slate-200 bg-white text-slate-900 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(15,23,42,0.08)]"
    : "border-rose-200 bg-rose-50 text-rose-900 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(244,63,94,0.14)]";
}

export function BookingPage({ language, phoneNumber }: BookingPageProps) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const isArabic = language === "ar";
  const session = getAuthSession();
  const resumeDraft = useMemo(() => loadBookingResumeDraft(location.state), [location.state]);
  const resumeModeKey = useMemo(() => getModeKeyFromDraft(resumeDraft), [resumeDraft]);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!session) {
      navigate("/login", { replace: true });
    }
  }, [session, navigate]);

  // Return early if not authenticated to prevent rendering booking page without session
  if (!session) {
    return null;
  }

  const customerPhone = phoneNumber || session?.phone || "";
  const establishmentId = session?.establishmentId ?? 1;
  const establishmentName = session?.establishmentName ?? "Laverie de la residence - Laverie Automatique";
  const [clientDisplayName, setClientDisplayName] = useState("Client");
  const [establishmentDisplayName, setEstablishmentDisplayName] = useState(establishmentName);
  const [establishmentAddress, setEstablishmentAddress] = useState("Adresse non renseignée");

  const [dashboardTab, setDashboardTab] = useState<DashboardTab>(resumeDraft ? "newBooking" : "myBookings");
  const [selectedModeKey, setSelectedModeKey] = useState<WashModeKey>(resumeModeKey ?? "express");
  const [selectedDate, setSelectedDate] = useState(resumeDraft?.booking_date ?? formatDateKey(new Date()));
  const [selectedTime, setSelectedTime] = useState(resumeDraft?.start_time ?? "");
  const [selectedBookingToEdit, setSelectedBookingToEdit] = useState<BookingRecord | null>(
    resumeDraft?.bookingId !== null && typeof resumeDraft?.bookingId === "number"
      ? ({ id: resumeDraft.bookingId, status: resumeDraft.bookingStatus ?? "EN_ATTENTE" } as BookingRecord)
      : null
  );
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<BookingRecord | null>(null);
  const [userBookings, setUserBookings] = useState<BookingRecord[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [availabilityByDate, setAvailabilityByDate] = useState<Record<string, DayAvailability>>({});
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const latestAvailabilityRequestRef = useRef(0);
  const wizardStep = useMemo(() => getWizardStepFromPath(location.pathname), [location.pathname]);

  const selectedMode = useMemo(() => getModeByKey(selectedModeKey), [selectedModeKey]);
  const selectedPrice = selectedMode.duration * selectedMode.pricePerMinute;
  const activeBookings = useMemo(
    () => userBookings.filter((booking) => booking.status !== "ANNULE"),
    [userBookings]
  );
  const hasBookings = activeBookings.length > 0;
  const isDashboardHome = isDashboardHomePath(location.pathname);
  const showDashboardHome = isDashboardHome && hasBookings;
  const selectedDayAvailability = availabilityByDate[selectedDate];
  const visibleSlots = useMemo(() => getVisibleSlots(selectedDayAvailability), [selectedDayAvailability]);
  const calendarDates = useMemo(() => getNextDates(DAY_COUNT), []);

  const handleLogout = () => {
    clearAuthSession();
    navigate("/login", { replace: true });
  };

  const handleLanguageChange = (nextLanguage: AppLanguage) => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
    setLanguageMenuOpen(false);
    window.location.reload();
  };

  const resetWizard = (keepMode = false, target: "mode" | "home" = "mode") => {
    setSelectedDate(formatDateKey(new Date()));
    setSelectedTime("");
    setSelectedBookingToEdit(null);
    if (!keepMode) {
      setSelectedModeKey("express");
    }
    navigate(target === "home" ? "/appointments" : BOOKING_STEP_PATHS.mode, { replace: true });
  };

  useEffect(() => {
    if (bookingsLoading) {
      return;
    }

    if (!isBookingPath(location.pathname)) {
      return;
    }

    const validPaths = ["/appointments", ...Object.values(BOOKING_STEP_PATHS)];
    if (!validPaths.includes(location.pathname)) {
      navigate(hasBookings ? "/appointments" : BOOKING_STEP_PATHS.mode, { replace: true });
      return;
    }

    if (isDashboardHome && !hasBookings) {
      setDashboardTab("newBooking");
      navigate(BOOKING_STEP_PATHS.mode, { replace: true });
    }
  }, [bookingsLoading, hasBookings, isDashboardHome, location.pathname, navigate]);

  const refreshAll = () => setRefreshCounter((value) => value + 1);

  const loadUserBookings = async () => {
    if (!customerPhone) {
      setUserBookings([]);
      setBookingsLoading(false);
      return;
    }

    setBookingsLoading(true);
    try {
      const response = await fetch(
        `/api/bookings/?search=${encodeURIComponent(customerPhone)}&establishment_id=${establishmentId}`,
        { headers: authHeader() }
      );

      if (response.ok) {
        const data = (await response.json()) as BookingRecord[];
        setUserBookings(Array.isArray(data) ? data : []);
      } else {
        setUserBookings([]);
      }
    } catch {
      setUserBookings([]);
    } finally {
      setBookingsLoading(false);
    }
  };

  const loadAvailability = async (mode: WashMode, signal: AbortSignal, requestId: number) => {
    setAvailabilityLoading(true);
    setAvailabilityError(null);

    try {
      const dates = getNextDates(DAY_COUNT);
      const start = dates[0];
      const end = dates[dates.length - 1];

      const response = await fetch(
        `/api/bookings/available-slots-range/?start=${start}&end=${end}&establishment_id=${establishmentId}&duration=${mode.duration}`,
        {
          signal,
          headers: authHeader(),
        }
      );

      if (!response.ok) {
        throw new Error(`Server returned ${response.status} ${response.statusText}`);
      }

      const payload = (await response.json()) as { availability?: Record<string, any> };

      const entries: Array<readonly [string, DayAvailability]> = Object.keys(payload.availability || {}).map((dateKey) => {
        const dayPayload = payload.availability[dateKey];
        return [dateKey, buildDayAvailability(dateKey, dayPayload, language)] as const;
      });

      if (!signal.aborted && requestId === latestAvailabilityRequestRef.current) {
        setAvailabilityByDate(Object.fromEntries(entries));
      }
    } catch (err) {
      if (!signal.aborted && requestId === latestAvailabilityRequestRef.current) {
        // Log to console for debugging and expose a more informative message in the UI
        // so the developer/user can see HTTP status or parsing errors.
        // eslint-disable-next-line no-console
        console.error("loadAvailability error:", err);
        const message = err instanceof Error ? err.message : String(err);
        setAvailabilityError(`Impossible de charger le calendrier. (${message})`);
        setAvailabilityByDate({});
      }
    } finally {
      if (!signal.aborted && requestId === latestAvailabilityRequestRef.current) {
        setAvailabilityLoading(false);
      }
    }
  };

  useEffect(() => {
    loadUserBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerPhone, establishmentId, refreshCounter]);

  useEffect(() => {
    let isMounted = true;

    const loadProfileDetails = async () => {
      try {
        const [userResponse, establishmentResponse] = await Promise.all([
          fetch(`/api/users/${session.userId}/`, { headers: authHeader() }),
          fetch(`/api/establishments/${establishmentId}/`, { headers: authHeader() }),
        ]);

        if (isMounted && userResponse.ok) {
          const userPayload = (await userResponse.json()) as { first_name?: string; last_name?: string };
          const nameParts = [userPayload.first_name, userPayload.last_name].filter(Boolean);
          setClientDisplayName(nameParts.length > 0 ? nameParts.join(" ") : "Client");
        }

        if (isMounted && establishmentResponse.ok) {
          const establishmentPayload = (await establishmentResponse.json()) as {
            name?: string;
            address?: string;
          };
          if (establishmentPayload.name) {
            setEstablishmentDisplayName(establishmentPayload.name);
          }
          setEstablishmentAddress(establishmentPayload.address || "Adresse non renseignée");
        }
      } catch {
        if (isMounted) {
          setClientDisplayName("Client");
          setEstablishmentDisplayName(establishmentName);
          setEstablishmentAddress("Adresse non renseignée");
        }
      }
    };

    void loadProfileDetails();

    return () => {
      isMounted = false;
    };
  }, [establishmentId, establishmentName, session.userId]);

  useEffect(() => {
    if (bookingsLoading) {
      return;
    }

    if (!isBookingPath(location.pathname)) {
      return;
    }

    if (!hasBookings) {
      setDashboardTab("newBooking");
      if (isDashboardHomePath(location.pathname)) {
        navigate(BOOKING_STEP_PATHS.mode, { replace: true });
      }
      return;
    }

    if (dashboardTab === "myBookings" && !isDashboardHomePath(location.pathname)) {
      navigate("/appointments", { replace: true });
    }
  }, [bookingsLoading, hasBookings, dashboardTab, location.pathname, navigate]);

  useEffect(() => {
    const controller = new AbortController();
    const requestId = latestAvailabilityRequestRef.current + 1;
    latestAvailabilityRequestRef.current = requestId;

    void loadAvailability(selectedMode, controller.signal, requestId);

    return () => {
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModeKey, establishmentId, refreshCounter, language]);

  const startNewBooking = () => {
    setDashboardTab("newBooking");
    resetWizard(true);
  };

  const openBookingForEdit = (booking: BookingRecord) => {
    setSelectedBookingToEdit(booking);
    setDashboardTab("newBooking");
    setSelectedModeKey(
      getModeByDuration(
        Math.max(getMinutesFromTime(booking.end_time.slice(0, 5)) - getMinutesFromTime(booking.start_time.slice(0, 5)), 15)
      ).key
    );
    setSelectedDate(booking.booking_date);
    setSelectedTime(booking.start_time.slice(0, 5));
    navigate(BOOKING_STEP_PATHS.calendar);
  };

  const openBookingDetails = (booking: BookingRecord) => {
    setSelectedBookingDetails(booking);
  };

  const closeBookingDetails = () => {
    setSelectedBookingDetails(null);
  };

  const selectDate = (dateValue: string) => {
    setSelectedDate(dateValue);
    navigate(BOOKING_STEP_PATHS.time);
  };

  const selectTime = (timeValue: string) => {
    setSelectedTime(timeValue);
    const confirmationDraft: ConfirmationDraft = {
      booking_date: selectedDate,
      start_time: timeValue,
      end_time: addMinutesToTime(timeValue, selectedMode.duration),
      total_price: String(selectedPrice),
      modeLabel: selectedMode.label,
      modeKey: selectedModeKey,
      bookingStatus: selectedBookingToEdit?.status,
      paymentMethod: "cash",
      clientName: clientDisplayName,
      establishmentName: establishmentDisplayName,
      establishmentAddress,
      bookingId: selectedBookingToEdit?.id ?? null,
    };

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("chrono-dz-confirmation-draft", JSON.stringify(confirmationDraft));
    }

    navigate("/confirmation", { replace: true, state: confirmationDraft });
  };

  const confirmReservation = async () => {
    if (!customerPhone || !session?.userId) {
      return;
    }

    setSubmittingBooking(true);
    setAvailabilityError(null);

    try {
      const startTime = selectedTime;
      const endTime = addMinutesToTime(selectedTime, selectedMode.duration);
      const bookingDate = selectedDate;
      const activeResourceId = await resolveAvailableResourceId({
        establishmentId,
        bookingDate,
        startTime,
        endTime,
        ignoreBookingId: selectedBookingToEdit?.id ?? null,
      });

      if (!activeResourceId) {
        setAvailabilityError("Aucun créneau libre n'est disponible sur cette date.");
        return;
      }

      const payload = {
        user: session.userId,
        resource: activeResourceId,
        booking_date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        status: selectedBookingToEdit?.status ?? "EN_ATTENTE",
        total_price: String(selectedPrice),
      };

      const response = await fetch(
        selectedBookingToEdit ? `/api/bookings/${selectedBookingToEdit.id}/` : "/api/bookings/",
        {
          method: selectedBookingToEdit ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeader(),
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.detail || "Impossible d'enregistrer le rendez-vous.");
      }

      const result = (await response.json()) as BookingRecord;
      setUserBookings((previousBookings) => {
        const withoutCurrent = previousBookings.filter((booking) => booking.id !== result.id);
        return [result, ...withoutCurrent];
      });
      const confirmationPayload: BookingConfirmationPayload = {
        booking_reference: result.booking_reference,
        booking_date: result.booking_date,
        start_time: result.start_time.slice(0, 5),
        end_time: result.end_time.slice(0, 5),
        total_price: result.total_price,
        modeLabel: selectedMode.label,
      };
      window.sessionStorage.setItem("chrono-dz-confirmation", JSON.stringify(confirmationPayload));
      refreshAll();
      setDashboardTab("myBookings");
      setSelectedBookingToEdit(null);
      navigate("/confirmation", { replace: true, state: confirmationPayload });
    } catch (error) {
      setAvailabilityError(error instanceof Error ? error.message : "Erreur inattendue.");
    } finally {
      setSubmittingBooking(false);
    }
  };

  const cancelAndReset = () => {
    setSelectedBookingToEdit(null);
    resetWizard(false, hasBookings ? "home" : "mode");
    setDashboardTab(hasBookings ? "myBookings" : "newBooking");
  };

  const cancelExistingBooking = async (bookingId: number) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...authHeader(),
        },
        body: JSON.stringify({ status: "ANNULE" }),
      });

      if (response.ok) {
        refreshAll();
      }
    } catch {
      // no-op
    }
  };

  if (bookingsLoading) {
    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-slate-50 text-slate-900">
        <div className="text-sm font-semibold text-slate-500">Chargement...</div>
      </main>
    );
  }

  if (isDashboardHome && !hasBookings) {
    return null;
  }

  return (
    <main dir={isArabic ? "rtl" : "ltr"} className="relative min-h-screen w-full overflow-x-hidden bg-slate-50 text-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.18),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(37,99,235,0.12),_transparent_24%),linear-gradient(135deg,rgba(248,250,252,1),rgba(241,245,249,1),rgba(255,255,255,1))]" />
      <div className="relative z-10 flex min-h-[100dvh] flex-col animate-fade-in">
        {hasBookings && dashboardTab === "myBookings" ? (
          <header className="sticky top-0 z-30 border-b border-white/50 bg-sky-500/95 px-0 py-3 text-white shadow-[0_18px_40px_rgba(8,15,33,0.18)] backdrop-blur-xl">
            <div className="flex w-full flex-col gap-3 px-[5px] sm:flex-row sm:flex-wrap sm:items-center lg:flex-nowrap lg:gap-4">
              <div className="flex items-center justify-between gap-2 sm:shrink-0">
                <div className="flex min-w-0 items-center gap-2 rounded-[1.3rem] border border-white/15 bg-white/12 px-[5px] py-[5px] shadow-[0_10px_28px_rgba(15,23,42,0.18)] backdrop-blur">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
                    <img src={logoImg} alt="Logo Laverie de la residence" className="h-8 w-auto" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black leading-none text-white">{t("appName")}</p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 sm:hidden">
                  <button
                    type="button"
                    onClick={() => setLanguageMenuOpen((value) => !value)}
                    className="inline-flex max-w-[7.5rem] items-center gap-2 rounded-full border border-white/10 bg-white/10 px-2.5 py-2 text-xs font-bold text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)] transition hover:bg-white/15"
                  >
                    <span className="truncate">{language === "ar" ? "العربية" : "Français"}</span>
                    <span className={`transition ${languageMenuOpen ? "rotate-180" : ""}`}>▾</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    aria-label="Se déconnecter"
                    title="Se déconnecter"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:bg-white/15"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 16l-4-4m0 0l4-4m-4 4h11" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5h3a2 2 0 012 2v10a2 2 0 01-2 2h-3" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="flex min-w-0 flex-1 items-center justify-start sm:justify-center">
                <div className="flex min-w-0 gap-2 overflow-x-auto rounded-[1.5rem] border border-white/10 bg-white/10 p-1.5 shadow-[0_10px_28px_rgba(15,23,42,0.16)] backdrop-blur sm:flex-nowrap sm:overflow-visible">
                  <button
                    type="button"
                    onClick={() => {
                      setDashboardTab("myBookings");
                      navigate("/appointments");
                    }}
                    className={`shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-xs font-bold transition sm:px-4 sm:py-2.5 sm:text-sm ${dashboardTab === "myBookings" ? "bg-white text-sky-900 shadow-[0_10px_24px_rgba(255,255,255,0.2)]" : "text-white/90 hover:bg-white/10 hover:text-white"}`}
                  >
                    {t("bookingNavMyBookings")}
                  </button>
                  <button
                    type="button"
                    onClick={startNewBooking}
                    className={`shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-xs font-bold transition sm:px-4 sm:py-2.5 sm:text-sm ${dashboardTab === "newBooking" ? "bg-cyan-400 text-sky-950 shadow-[0_10px_24px_rgba(34,211,238,0.22)]" : "text-white/90 hover:bg-white/10 hover:text-white"}`}
                  >
                    {t("bookingNavCreateBooking")}
                  </button>
                </div>
              </div>

              <div className="ml-auto hidden shrink-0 items-center gap-2 sm:flex">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setLanguageMenuOpen((value) => !value)}
                  className="inline-flex max-w-[9rem] items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm font-bold text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)] transition hover:bg-white/15 sm:max-w-none sm:px-4 sm:py-2.5"
                >
                  <span className="truncate text-base">{language === "ar" ? "العربية" : "Français"}</span>
                  <span className={`transition ${languageMenuOpen ? "rotate-180" : ""}`}>▾</span>
                </button>

                {languageMenuOpen ? (
                  <div className="absolute end-0 top-[calc(100%+0.5rem)] w-[min(11rem,calc(100vw-1rem))] overflow-hidden rounded-[1.2rem] border border-slate-200 bg-white p-1.5 text-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.22)] sm:w-44">
                    <button
                      type="button"
                      onClick={() => handleLanguageChange("fr")}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-sky-50 ${language === "fr" ? "bg-sky-50 text-sky-700" : ""}`}
                    >
                      <span>Français</span>
                      <span className="text-xs font-black uppercase tracking-[0.22em]">FR</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLanguageChange("ar")}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition hover:bg-sky-50 ${language === "ar" ? "bg-sky-50 text-sky-700" : ""}`}
                    >
                      <span>العربية</span>
                      <span className="text-xs font-black uppercase tracking-[0.22em]">AR</span>
                    </button>
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={handleLogout}
                aria-label="Se déconnecter"
                title="Se déconnecter"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/10 text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:bg-white/15"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} className="h-5.5 w-5.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 16l-4-4m0 0l4-4m-4 4h11" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5h3a2 2 0 012 2v10a2 2 0 01-2 2h-3" />
                </svg>
              </button>
            </div>
            </div>
          </header>
        ) : null}

        <div className="flex flex-1 flex-col">
          {showDashboardHome ? (
            <section className="grid flex-1 gap-0 lg:grid-cols-[0.78fr_1.22fr] animate-scale-in">
              <aside className="relative flex min-h-[34vh] flex-col justify-start overflow-hidden bg-gradient-to-br from-sky-600 via-sky-500 to-cyan-500 px-4 py-6 text-white sm:min-h-[40vh] sm:px-8 sm:py-8 lg:min-h-[calc(100dvh-74px)] lg:justify-start lg:px-10 lg:py-10">
                <div className="absolute inset-0 opacity-30">
                  <div className="absolute -left-20 top-8 h-44 w-44 rounded-full bg-white/30 blur-3xl animate-float" />
                  <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-sky-300/30 blur-3xl animate-float delay-300" />
                </div>
                <div className="relative space-y-4 sm:space-y-5 lg:pt-2 xl:pt-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.42em] text-sky-50/90">{t("bookingDashboardClient")}</p>
                  <h1 className="max-w-md text-[2.15rem] font-black leading-[1.05] sm:text-5xl">
                    {t("bookingHeroTitle")}
                  </h1>
                </div>

                <div className="relative mt-6 grid gap-4 rounded-[1.8rem] border border-white/15 bg-white/10 p-4 shadow-[0_16px_40px_rgba(2,132,199,0.18)] backdrop-blur-xl sm:mt-8 sm:p-5 lg:mt-10 xl:mt-12">
                  <div className="flex items-center justify-between rounded-[1.25rem] bg-white/10 px-4 py-3">
                    <span className="font-semibold text-white">{t("bookingActiveBookings")}</span>
                    <span className="text-xl font-black text-white">{activeBookings.length}</span>
                  </div>
                  <div className="rounded-[1.25rem] bg-white/10 px-4 py-3 text-sm leading-6 text-sky-50/90">
                    {t("bookingTopHint")}
                  </div>
                </div>
              </aside>

                <div className="flex flex-col px-4 py-5 sm:px-6 sm:py-8 lg:px-8 animate-fade-in-up">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.35em] text-sky-500">{t("bookingMyBookingsHeader")}</p>
                    <h2 className="mt-2 text-2xl font-black text-slate-900 sm:text-3xl">{t("bookingHistoryTitle")}</h2>
                  </div>
                </div>

                <div className="grid gap-4">
                  {activeBookings.length === 0 ? (
                    <div className="rounded-[1.75rem] border border-dashed border-sky-200 bg-white/80 p-8 text-center text-slate-500">
                      {t("bookingNoBookings")}
                    </div>
                    ) : (
                    activeBookings.map((booking) => (
                      <article
                        key={booking.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => openBookingDetails(booking)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openBookingDetails(booking);
                          }
                        }}
                        className="cursor-pointer rounded-[1.75rem] border border-sky-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(15,23,42,0.08)] animate-scale-in"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.3em] text-sky-500">{booking.booking_reference}</p>
                            <h3 className="mt-2 text-2xl font-black text-slate-900">
                              {getModeByDuration(Math.max(getMinutesFromTime(booking.end_time.slice(0, 5)) - getMinutesFromTime(booking.start_time.slice(0, 5)), 10)).label}
                            </h3>
                            <p className="mt-1 text-sm text-slate-500">
                              {dateToLongLabel(booking.booking_date, language)} • {booking.start_time.slice(0, 5)} - {booking.end_time.slice(0, 5)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => openBookingDetails(booking)}
                            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.22em] shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(15,23,42,0.12)] ${
                              booking.status === "PAYE"
                                ? "border-emerald-200/80 bg-emerald-50/95 text-emerald-700 ring-1 ring-emerald-100"
                                : booking.status === "ANNULE"
                                  ? "border-rose-200/80 bg-rose-50/95 text-rose-700 ring-1 ring-rose-100"
                                  : "border-amber-200/80 bg-amber-50/95 text-amber-800 ring-1 ring-amber-100"
                            }`}
                            aria-label={`${t("bookingViewDetails")} ${booking.booking_reference}`}
                          >
                            <span
                              className={`h-2.5 w-2.5 rounded-full shadow-[0_0_0_4px_rgba(255,255,255,0.55)] ${
                                booking.status === "PAYE"
                                  ? "bg-emerald-500"
                                  : booking.status === "ANNULE"
                                    ? "bg-rose-500"
                                    : "bg-amber-500"
                              }`}
                            />
                            {booking.status === "PAYE" ? t("bookingStatusValidated") : booking.status === "ANNULE" ? t("bookingStatusCancelled") : t("bookingStatusPendingPayment")}
                          </button>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sky-50/60 px-4 py-3 text-sm">
                          <span className="font-semibold text-slate-600">{booking.resource_label}</span>
                          <span className="font-black text-slate-900">{booking.total_price} DA</span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openBookingForEdit(booking);
                            }}
                            className="rounded-2xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500"
                          >
                            {t("bookingModify")}
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              cancelExistingBooking(booking.id);
                            }}
                            className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                          >
                            {t("bookingCancel")}
                          </button>
                        </div>
                      </article>
                    ))
                  )}
                </div>
              </div>
            </section>
            ) : (
            <section className="flex flex-1 items-stretch animate-scale-in">
              <div className="grid min-h-full w-full lg:min-h-[calc(100dvh-0px)] lg:grid-cols-[0.88fr_1.12fr]">
                <aside className="order-2 relative flex min-h-[30vh] flex-col justify-between overflow-hidden bg-gradient-to-br from-cyan-500 via-sky-600 to-blue-700 px-4 py-5 text-white sm:min-h-[36vh] sm:px-8 sm:py-8 lg:order-1 lg:min-h-full lg:px-10">
                  <div className="absolute inset-0 opacity-30">
                    <div className="absolute -left-20 top-8 h-44 w-44 rounded-full bg-white/30 blur-3xl animate-float" />
                    <div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-sky-300/30 blur-3xl animate-float delay-300" />
                  </div>
                  <div className="relative flex flex-1 items-center justify-start py-2 sm:py-8 lg:py-10">
                    <div className="space-y-4 text-left sm:space-y-5">
                      <h1 className="max-w-[34rem] text-[2rem] font-black leading-[1.08] sm:text-5xl">
                        <span className="block">Choisissez votre programme</span>
                        <span className="block">de lavage</span>
                      </h1>
                      <p className="max-w-lg text-sm leading-6 text-sky-50/90 sm:text-base sm:leading-7">
                        Sélectionnez un mode, puis choisissez la date et l’heure disponibles.
                      </p>
                    </div>
                  </div>

                  <div className="relative mt-4 grid gap-3 rounded-[1.5rem] border border-white/15 bg-white/10 p-4 text-sm text-sky-50/90 shadow-[0_16px_40px_rgba(2,132,199,0.18)] backdrop-blur-xl sm:mt-8 sm:rounded-[1.75rem] sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-white">Tarif unitaire</span>
                      <span className="text-lg font-black text-white">{selectedMode.pricePerMinute} DA / min</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-white">Durée sélectionnée</span>
                      <span className="text-lg font-black text-white">{selectedMode.duration} min</span>
                    </div>
                    <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-medium text-sky-50/90">{selectedMode.description}</div>
                  </div>
                </aside>

                <div className="order-1 flex min-h-0 flex-col px-4 py-4 pb-7 sm:px-6 sm:py-8 lg:order-2 lg:px-8 lg:py-9 animate-fade-in-up">
                  {availabilityError ? (
                    <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                      {availabilityError}
                    </div>
                  ) : null}

                  {wizardStep === "mode" ? (
                    <WizardModeStep
                      selectedModeKey={selectedModeKey}
                      selectedMode={selectedMode}
                      language={language}
                      selectedPrice={selectedPrice}
                      onSelectMode={setSelectedModeKey}
                      onNext={() => navigate(BOOKING_STEP_PATHS.calendar)}
                    />
                  ) : null}

                  {wizardStep === "calendar" ? (
                    <WizardCalendarStep
                      selectedMode={selectedMode}
                      selectedDate={selectedDate}
                      language={language}
                      days={calendarDates.map((dateValue) => availabilityByDate[dateValue] ?? buildFallbackDay(dateValue, language, selectedMode))}
                      loading={availabilityLoading}
                      onSelectDate={selectDate}
                      onBack={() => navigate(BOOKING_STEP_PATHS.mode)}
                    />
                  ) : null}

                  {wizardStep === "time" ? (
                    <WizardTimeStep
                      selectedMode={selectedMode}
                      selectedDate={selectedDate}
                      selectedTime={selectedTime}
                      language={language}
                      dayAvailability={selectedDayAvailability}
                      visibleSlots={visibleSlots}
                      onBack={() => navigate(BOOKING_STEP_PATHS.calendar)}
                      onSelectTime={selectTime}
                    />
                  ) : null}

                </div>
              </div>
            </section>
          )}
        </div>

        {selectedBookingDetails ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm animate-fade-in"
            role="presentation"
            onClick={closeBookingDetails}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Détails du rendez-vous"
              onClick={(event) => event.stopPropagation()}
              className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.28)]"
            >
              <div className="bg-gradient-to-r from-sky-500 via-cyan-500 to-blue-600 px-6 py-5 text-white sm:px-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.35em] text-white/80">{t("bookingDetailsDialogTitle")}</p>
                    <h3 className="mt-2 text-3xl font-black tracking-tight">{selectedBookingDetails.booking_reference}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={closeBookingDetails}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/15 text-white transition hover:bg-white/25"
                    aria-label={t("close")}
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="grid gap-4 px-6 py-6 sm:grid-cols-2 sm:px-7">
                <DetailCard label={t("bookingDetailsStatus")} value={selectedBookingDetails.status === "PAYE" ? t("bookingStatusValidated") : selectedBookingDetails.status === "ANNULE" ? t("bookingStatusCancelled") : t("bookingStatusPendingPayment")} accent={selectedBookingDetails.status === "PAYE" ? "emerald" : selectedBookingDetails.status === "ANNULE" ? "rose" : "amber"} />
                <DetailCard label={t("bookingDetailsMode")} value={getModeByDuration(Math.max(getMinutesFromTime(selectedBookingDetails.end_time.slice(0, 5)) - getMinutesFromTime(selectedBookingDetails.start_time.slice(0, 5)), 10)).label} />
                <DetailCard label={t("bookingDetailsDate")} value={dateToLongLabel(selectedBookingDetails.booking_date, language)} />
                <DetailCard label={t("bookingDetailsTime")} value={`${selectedBookingDetails.start_time.slice(0, 5)} - ${selectedBookingDetails.end_time.slice(0, 5)}`} />
                <DetailCard label={t("bookingDetailsPoste")} value={selectedBookingDetails.resource_label} />
                <DetailCard label={t("bookingDetailsAmount")} value={`${selectedBookingDetails.total_price} DA`} />
                <DetailCard label={t("bookingDetailsEstablishment")} value={selectedBookingDetails.establishment_name} className="sm:col-span-2" />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 px-6 py-5 sm:px-7">
                <button
                  type="button"
                  onClick={closeBookingDetails}
                  className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {t("close")}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function DetailCard({
  label,
  value,
  accent = "sky",
  className,
}: {
  label: string;
  value: string;
  accent?: "sky" | "emerald" | "rose" | "amber";
  className?: string;
}) {
  const accentClasses = {
    sky: "border-sky-100 bg-sky-50/70 text-sky-700",
    emerald: "border-emerald-100 bg-emerald-50/70 text-emerald-700",
    rose: "border-rose-100 bg-rose-50/70 text-rose-700",
    amber: "border-amber-100 bg-amber-50/70 text-amber-800",
  } as const;

  return (
    <div className={`rounded-[1.5rem] border p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)] ${accentClasses[accent]} ${className ?? ""}`}>
      <p className="text-[11px] font-black uppercase tracking-[0.3em] opacity-80">{label}</p>
      <p className="mt-2 text-lg font-black leading-snug text-slate-900">{value}</p>
    </div>
  );
}

async function resolveAvailableResourceId({
  establishmentId,
  bookingDate,
  startTime,
  endTime,
  ignoreBookingId,
}: {
  establishmentId: number;
  bookingDate: string;
  startTime: string;
  endTime: string;
  ignoreBookingId: number | null;
}) {
  const requestedStartMinutes = getMinutesFromTime(startTime.slice(0, 5));
  const requestedEndMinutes = getMinutesFromTime(endTime.slice(0, 5));

  const [resourcesResponse, bookingsResponse] = await Promise.all([
    fetch(`/api/resources/?establishment_id=${establishmentId}`, { headers: authHeader() }),
    fetch(`/api/bookings/?establishment_id=${establishmentId}&date=${bookingDate}`, { headers: authHeader() }),
  ]);

  if (!resourcesResponse.ok || !bookingsResponse.ok) {
    return null;
  }

  const resources = (await resourcesResponse.json()) as Array<{ id: number; status: string }>;
  const bookings = (await bookingsResponse.json()) as BookingRecord[];

  const activeResources = resources.filter((resource) => resource.status === "ACTIF");
  if (activeResources.length === 0) {
    return null;
  }

  for (const resource of activeResources) {
      const conflict = bookings.some((booking) => {
      if (ignoreBookingId && booking.id === ignoreBookingId) {
        return false;
      }

      if (booking.status === "ANNULE") {
        return false;
      }

      if (!booking.resource) {
        return false;
      }

      const bookingStartMinutes = getMinutesFromTime(booking.start_time.slice(0, 5));
      const bookingEndMinutes = getMinutesFromTime(booking.end_time.slice(0, 5));
      const overlaps = bookingStartMinutes < requestedEndMinutes && bookingEndMinutes > requestedStartMinutes;
      return overlaps && booking.resource === resource.id;
    });

    if (!conflict) {
      return resource.id;
    }
  }

  return null;
}

function buildFallbackDay(dateValue: string, language: AppLanguage, mode: WashMode): DayAvailability {
  return {
    date: dateValue,
    label: dateToLabel(dateValue, language),
    weekday: dateToLabel(dateValue, language).split(" ")[0],
    slots: [],
    opening_time: "08:00",
    closing_time: "22:00",
    total_resources: 0,
    availableCount: 0,
    fullCount: 0,
    isAvailable: false,
  };
}

function WizardModeStep({
  selectedModeKey,
  selectedMode,
  language,
  selectedPrice,
  onSelectMode,
  onNext,
}: {
  selectedModeKey: WashModeKey;
  selectedMode: WashMode;
  language?: AppLanguage;
  selectedPrice: number;
  onSelectMode: (modeKey: WashModeKey) => void;
  onNext: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex h-full flex-col gap-5 sm:gap-6">
      <div className="pt-2 sm:pt-6">
        <p className="text-xs font-bold uppercase tracking-[0.35em] text-sky-500">{t("bookingModeIntro")}</p>
        <h2 className="mt-2 text-2xl font-black leading-[1.08] tracking-tight text-slate-900 sm:text-3xl">
          <span className="block">{t("bookingModeTitle")}</span>
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          {t("bookingModeIntroSub")}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
        {WASH_MODES.map((mode, index) => {
          const active = selectedModeKey === mode.key;
          return (
            <button
              key={mode.key}
              type="button"
              onClick={() => onSelectMode(mode.key)}
              className={`group relative overflow-hidden rounded-[1.45rem] border p-4 text-left transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)] sm:rounded-[1.75rem] sm:p-5 ${active ? "border-sky-500 bg-sky-50 shadow-[0_24px_60px_rgba(14,165,233,0.18)]" : "border-sky-100 bg-white/95"} animate-fade-in-up`}
              style={{ animationDelay: `${index * 90}ms` }}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${mode.accent} opacity-0 transition-opacity duration-300 group-hover:opacity-5 ${active ? "opacity-10" : ""}`} />
              <div className="relative flex h-full flex-col justify-between gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">{mode.label}</h3>
                    <div className="mt-2 h-1 w-14 rounded-full bg-sky-500/20" />
                  </div>
                  <div className={`flex min-w-[4.7rem] items-center justify-center rounded-2xl px-2.5 py-2 text-center sm:min-w-[5.5rem] sm:px-3 ${active ? "bg-sky-600 text-white shadow-[0_12px_30px_rgba(14,165,233,0.28)]" : "bg-sky-50 text-sky-700"}`}>
                    <span className="block text-[0.68rem] font-black uppercase tracking-[0.32em] leading-none whitespace-nowrap">
                      {mode.duration} min
                    </span>
                  </div>
                </div>

                <p className="text-sm leading-6 text-slate-500">{mode.description}</p>

                <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-600">Prix unitaire</span>
                    <span className="font-black text-slate-900">{mode.pricePerMinute} DA / min</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-600">Total</span>
                    <span className="text-lg font-black text-slate-900">{mode.duration * mode.pricePerMinute} DA</span>
                  </div>
                </div>

                <div className={`rounded-2xl px-4 py-3 text-center text-sm font-semibold transition ${active ? "bg-sky-600 text-white shadow-[0_10px_25px_rgba(14,165,233,0.24)]" : "bg-slate-50 text-slate-500 group-hover:bg-sky-100 group-hover:text-sky-700"}`}>
                  {active ? t("selectedSlot") : t("bookingViewDetails")}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="sticky bottom-2 z-20 rounded-[1.3rem] border border-sky-100 bg-white/95 p-3 shadow-[0_18px_38px_rgba(15,23,42,0.12)] backdrop-blur sm:static sm:rounded-[1.75rem] sm:bg-white/80 sm:p-4 sm:shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-sky-500">{t("bookingSummaryTitle")}</p>
            <p className="text-base font-black text-slate-900 sm:text-lg">{selectedMode.label} • {selectedMode.duration} min • {selectedPrice} DA</p>
          </div>

          <button
            type="button"
            onClick={onNext}
            className="group inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-6 py-3.5 text-sm font-bold text-white shadow-[0_16px_40px_rgba(15,23,42,0.22)] transition hover:-translate-y-0.5 hover:bg-slate-800 sm:w-auto"
          >
            {t("bookingNext")}
            <span className="ml-2 transition group-hover:translate-x-1">→</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function WizardCalendarStep({
  selectedMode,
  selectedDate,
  language,
  days,
  loading,
  onSelectDate,
  onBack,
}: {
  selectedMode: WashMode;
  selectedDate: string;
  language?: AppLanguage;
  days: DayAvailability[];
  loading: boolean;
  onSelectDate: (dateValue: string) => void;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const todayKey = formatDateKey(new Date());
  const visibleDays = days.filter((day) => !(day.date === todayKey && day.availableCount === 0));

  return (
    <div className="flex h-full min-h-0 flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-sky-500">{t("bookingDateTitle")}</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">{t("bookingDateTitle")}</h2>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="rounded-2xl border border-sky-100 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-sky-50"
        >
          {t("bookingBack")}
        </button>
      </div>

      {loading ? (
        <div className="flex min-h-[300px] flex-1 items-center justify-center rounded-[1.75rem] border border-sky-100 bg-white/80 text-sm font-semibold text-slate-500 sm:min-h-[360px]">
          {t("bookingCalendarLoading")}
        </div>
      ) : (
        <div className="grid min-h-0 max-h-[calc(100dvh-210px)] flex-1 grid-cols-1 gap-3 overflow-y-auto pr-1 pb-1 sm:max-h-[calc(100dvh-250px)] sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {visibleDays.map((day, index) => {
            const active = day.date === selectedDate;
            const isSelectable = day.isAvailable;
            const cardClass = active
              ? "border-sky-500 bg-gradient-to-br from-sky-600 via-sky-500 to-cyan-500 text-white shadow-[0_22px_50px_rgba(14,165,233,0.24)]"
              : day.isAvailable
                ? "border-sky-100 bg-white/95 text-slate-900 shadow-[0_14px_36px_rgba(15,23,42,0.06)] hover:-translate-y-1 hover:border-sky-200 hover:shadow-[0_18px_42px_rgba(14,165,233,0.12)]"
                : "border-rose-100 bg-gradient-to-br from-rose-50 to-white text-rose-900 shadow-[0_14px_36px_rgba(244,63,94,0.08)]";
            return (
              <button
                key={day.date}
                type="button"
                disabled={!isSelectable}
                onClick={() => {
                  if (isSelectable) {
                    onSelectDate(day.date);
                  }
                }}
                className={`group relative min-h-[100px] overflow-hidden rounded-[1.6rem] border p-3.5 text-left backdrop-blur-xl transition duration-300 ease-out sm:min-h-[112px] sm:p-4 ${cardClass} ${active ? "ring-4 ring-sky-200 ring-offset-2 ring-offset-white" : ""} ${isSelectable ? "" : "cursor-not-allowed opacity-85"} animate-fade-in-up`}
                style={{ animationDelay: `${index * 55}ms` }}
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-0 transition group-hover:opacity-100" />
                <div className="relative flex flex-wrap items-start justify-between gap-2 sm:gap-4">
                  <div>
                    <p className={`text-[9px] font-black uppercase tracking-[0.24em] sm:text-[10px] sm:tracking-[0.35em] ${active ? "text-white/80" : day.isAvailable ? "text-sky-400" : "text-rose-400"}`}>
                      {day.weekday}
                    </p>
                    <p className={`mt-1 text-xl font-black leading-tight tracking-tight sm:text-2xl ${active ? "text-white" : "text-slate-900"}`}>
                      {day.label.split(" ").slice(1).join(" ")}
                    </p>
                  </div>
                  <span className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em] shadow-sm sm:px-3 sm:text-[10px] sm:tracking-[0.25em] ${active ? "bg-white/18 text-white ring-1 ring-white/35 backdrop-blur" : day.isAvailable ? "bg-sky-50 text-sky-700 ring-1 ring-sky-100" : "bg-rose-100 text-rose-700 ring-1 ring-rose-200"}`}>
                    {day.isAvailable ? "Libre" : "Complet"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function WizardTimeStep({
  selectedMode,
  selectedDate,
  selectedTime,
  language,
  dayAvailability,
  visibleSlots,
  onBack,
  onSelectTime,
}: {
  selectedMode: WashMode;
  selectedDate: string;
  selectedTime: string;
  language: AppLanguage;
  dayAvailability: DayAvailability | undefined;
  visibleSlots: TimeSlot[];
  onBack: () => void;
  onSelectTime: (timeValue: string) => void;
}) {
  const { t } = useTranslation();
  const availableSlots = visibleSlots.filter((slot) => slot.status === "AVAILABLE");
  const totalSlots = visibleSlots.length;

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-sky-500">{t("bookingTimeTitle")}</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">{t("bookingTimeTitle")}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            {dateToLongLabel(selectedDate, language)} • {selectedMode.label} • {selectedMode.duration} min • {selectedMode.pricePerMinute} DA / min.
          </p>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="rounded-2xl border border-sky-100 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-sky-50"
        >
          {t("bookingBack")}
        </button>
      </div>

      <section className="rounded-[2rem] border border-sky-100 bg-white/90 p-4 shadow-[0_20px_60px_rgba(15,23,42,0.06)] backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-sky-500">{t("bookingTimeTitle")}</p>
            <p className="mt-1 text-sm text-slate-500">{t("bookingModeSubtitle")}</p>
          </div>

          
        </div>

        {totalSlots === 0 ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-[1.5rem] bg-slate-50 text-sm font-semibold text-slate-500">
            {t("bookingNoSlots")}
          </div>
        ) : (
          <div className="grid max-h-[calc(100dvh-280px)] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5">
            {visibleSlots.map((slot, index) => {
              const active = slot.start_time === selectedTime;
              const isClickable = slot.status === "AVAILABLE";
              const cardBgClass = active
                ? "border-sky-600 bg-gradient-to-br from-sky-600 via-sky-500 to-cyan-500 text-white shadow-[0_18px_50px_rgba(14,165,233,0.24)]"
                : isClickable
                  ? "border-sky-100 bg-white text-slate-900 shadow-[0_12px_36px_rgba(15,23,42,0.08)] hover:-translate-y-1 hover:border-sky-200 hover:shadow-[0_16px_42px_rgba(14,165,233,0.14)]"
                  : "border-rose-100 bg-gradient-to-br from-rose-50 to-white text-rose-700 shadow-[0_12px_36px_rgba(244,63,94,0.08)]";
              return (
                <button
                  key={`${selectedDate}-${slot.start_time}`}
                  type="button"
                  disabled={!isClickable}
                  onClick={() => onSelectTime(slot.start_time)}
                  className={`group relative overflow-hidden rounded-[1.6rem] border p-4 text-left backdrop-blur-xl transition duration-300 ease-out sm:p-5 ${cardBgClass} ${active ? "ring-4 ring-sky-200 ring-offset-2 ring-offset-white" : ""} ${isClickable ? "" : "cursor-not-allowed opacity-60"} animate-fade-in-up`}
                  style={{
                    animationDelay: `${index * 50}ms`
                  }}
                >
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-0 transition group-hover:opacity-100" />
                  <div className="relative flex flex-col gap-4">
                    <div className="flex items-baseline justify-between gap-2">
                      <div>
                        <div className={`text-2xl font-black tracking-tight sm:text-3xl ${active ? "text-white" : "text-slate-900"}`}>
                          {slot.start_time}
                        </div>
                        <div className={`mt-1 text-xs font-bold uppercase tracking-[0.28em] ${active ? "text-white/75" : "text-sky-500"}`}>
                          jusqu'à {slot.end_time}
                        </div>
                      </div>
                    </div>

                    <div className={`text-sm font-semibold leading-snug ${active ? "text-white" : isClickable ? "text-slate-600" : "text-rose-600"}`}>
                      {active ? "✓ Sélectionné" : isClickable ? "Disponible" : "Complet"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function WizardSummaryStep({
  selectedMode,
  selectedDate,
  selectedTime,
  language,
  clientName,
  establishmentName,
  establishmentAddress,
  price,
  editing,
  submitting,
  onConfirm,
  onCancel,
  onModify,
}: {
  selectedMode: WashMode;
  selectedDate: string;
  selectedTime: string;
  language: AppLanguage;
  clientName: string;
  establishmentName: string;
  establishmentAddress: string;
  price: number;
  editing: boolean;
  submitting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onModify: () => void;
}) {
  const { t } = useTranslation();
  const timeRangeLabel = isValidTimeValue(selectedTime)
    ? `${selectedTime} - ${addMinutesToTime(selectedTime, selectedMode.duration)}`
    : "Heure non définie";

  return (
    <div className="flex h-full flex-col gap-6 lg:gap-8">
      <div className="relative overflow-hidden rounded-[2rem] border border-sky-100 bg-white/80 p-6 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-7">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 via-cyan-400 to-indigo-500" />
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-sky-500">{t("bookingSummaryTitle")}</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">{t("bookingConfirmTitle")}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              {t("bookingConfirmSubtitle")}
            </p>
          </div>
          <div className="rounded-full border border-sky-100 bg-sky-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.3em] text-sky-700 shadow-sm">
            {t("bookingStepFinal")}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryTile label="Client" value={clientName} />
        <SummaryTile label="Établissement" value={establishmentName} />
        <SummaryTile label="Adresse" value={establishmentAddress} className="sm:col-span-2" />
        <SummaryTile label="Date & heure" value={`${dateToLongLabel(selectedDate, language)} • ${timeRangeLabel}`} className="sm:col-span-2" />
        <SummaryTile label="Mode de lavage" value={selectedMode.label} />
        <SummaryTile label="Prix total" value={`${price} DA`} />
      </div>

      <p className="text-sm font-semibold text-slate-600">{t("bookingConfirmQuestion")}</p>

      <div className="mt-2 flex flex-col items-end gap-3 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="order-1 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-slate-50"
        >
          {t("bookingCancel")}
        </button>
        <button
          type="button"
          onClick={onModify}
          className="order-2 rounded-2xl border border-sky-100 bg-sky-50 px-5 py-3 text-sm font-semibold text-sky-700 transition hover:-translate-y-0.5 hover:bg-sky-100"
        >
          {t("bookingModify")}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={submitting}
          className="order-3 rounded-2xl bg-slate-950 px-6 py-3 text-sm font-bold text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)] transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {submitting ? t("bookingLoading") : t("bookingConfirmButton")}
        </button>
      </div>
    </div>
  );
}

function SummaryTile({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={`rounded-[1.5rem] border border-sky-100 bg-white/80 p-5 shadow-sm ${className ?? ""}`}>
      <p className="text-xs font-bold uppercase tracking-[0.3em] text-sky-500">{label}</p>
      <p className="mt-2 text-lg font-black leading-tight text-slate-900">{value}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs font-bold uppercase tracking-[0.3em] text-sky-50/80">{label}</span>
      <span className="text-right text-sm font-black text-white">{value}</span>
    </div>
  );
}


