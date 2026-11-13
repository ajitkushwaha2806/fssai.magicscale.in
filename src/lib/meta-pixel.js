// Meta Pixel Helper for Maximum ROAS & Event Match Quality (EMQ)

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID || "1165722612645475";

/**
 * Normalizes Indian phone numbers to Meta's expected format (e.g. 91XXXXXXXXXX)
 */
export function normalizePhone(phone) {
  if (!phone) return "";
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) return `91${cleaned}`;
  if (cleaned.length === 12 && cleaned.startsWith("91")) return cleaned;
  return cleaned;
}

/**
 * Splits a full name into first and last name for Meta Advanced Matching
 */
export function splitName(fullName) {
  if (!fullName) return { fn: "", ln: "" };
  const parts = fullName.trim().split(/\s+/);
  const fn = parts[0] || "";
  const ln = parts.slice(1).join(" ") || "";
  return { fn, ln };
}

/**
 * Safe wrapper to invoke window.fbq
 */
export function fbq(...args) {
  if (typeof window !== "undefined" && window.fbq) {
    try {
      window.fbq(...args);
    } catch (e) {
      console.warn("[Meta Pixel] Error calling fbq:", e);
    }
  }
}

/**
 * Updates Meta Advanced Matching user data.
 * Meta client library automatically hashes strings (SHA-256) on the client side.
 * High EMQ (Event Match Quality) directly improves Facebook ad attribution & ROAS.
 */
export function setMetaUserData(user = {}) {
  const { fn, ln } = splitName(user.name);
  const data = {};

  if (user.email) data.em = user.email.trim().toLowerCase();
  if (user.phone) data.ph = normalizePhone(user.phone);
  if (fn) data.fn = fn.toLowerCase();
  if (ln) data.ln = ln.toLowerCase();
  if (user.city) data.ct = user.city.trim().toLowerCase().replace(/[^a-z]/g, "");
  if (user.state) data.st = user.state.trim().toLowerCase().replace(/[^a-z]/g, "");
  if (user.pincode) data.zp = user.pincode.toString().trim();
  data.country = "in";

  if (Object.keys(data).length > 0) {
    fbq("init", META_PIXEL_ID, data);
  }
}

/**
 * 1. PageView Event
 */
export function trackPageView() {
  fbq("track", "PageView");
}

/**
 * 2. ViewContent Event (Landing Page / Service pricing view)
 */
export function trackViewContent(details = {}) {
  fbq("track", "ViewContent", {
    content_name: details.name || "FSSAI License Registration Online",
    content_category: details.category || "Food Safety Registration",
    content_ids: [details.id || "fssai_license_service"],
    content_type: "product",
    value: parseFloat(details.value || 699),
    currency: "INR",
  });
}

/**
 * 3. Application Form Opened
 * Replaces the incorrect InitiateCheckout when a user merely opens the modal
 */
export function trackApplicationFormOpened(details = {}) {
  fbq("track", "Contact", {
    content_name: details.name || "FSSAI Application Form Opened",
  });
}

/**
 * 4. Lead Event (Step 1: Name, Phone, Business Type submitted)
 * Attaches user phone & name for high-priority Lead matching.
 */
export function trackLead({ name, phone, businessType, value, planId }) {
  setMetaUserData({ name, phone });

  fbq("track", "Lead", {
    content_name: "FSSAI Application Lead",
    content_category: businessType || "Food Business",
    content_ids: [planId || "fssai_plan"],
    value: parseFloat(value || 699),
    currency: "INR",
  });
}

/**
 * 5. InitiateCheckout Event (Step 3: User proceeds to Paytm Advance Payment)
 * The TRUE checkout event with advance amount.
 */
export function trackInitiateCheckout({ planId, amount, name, email, phone, city, state, pincode }) {
  setMetaUserData({ name, email, phone, city, state, pincode });

  fbq("track", "InitiateCheckout", {
    content_name: "FSSAI Registration Advance Payment",
    content_category: "Food License Advance",
    content_ids: [planId || "fssai_plan"],
    content_type: "product",
    value: parseFloat(amount || 100),
    currency: "INR",
    num_items: 1,
  });
}

/**
 * 6. Purchase Event (Payment Success on /payment-status/success)
 * Optimized for MAXIMUM ROAS:
 * - Deduplication via orderId (prevents reload double-counting)
 * - Complete Advanced Matching (name, email, phone, address, city, pin)
 * - eventID passed for CAPI compatibility
 */
export function trackPurchase({ orderId, amount, planId, name, email, phone, address, city, state, pincode }) {
  if (!orderId) return;

  const storageKey = `meta_purchase_tracked_${orderId}`;
  if (typeof window !== "undefined") {
    if (localStorage.getItem(storageKey) || sessionStorage.getItem(storageKey)) {
      console.log(`[Meta Pixel] Purchase already tracked for order ${orderId}, skipping duplicate.`);
      return;
    }
  }

  // Set rich Advanced Matching parameters
  setMetaUserData({ name, email, phone, city, state, pincode, address });

  const purchaseValue = parseFloat(amount || 100);

  // Track Purchase with eventID for deduplication
  fbq(
    "track",
    "Purchase",
    {
      content_name: "FSSAI License Registration",
      content_type: "product",
      content_ids: [planId || "fssai_plan"],
      value: purchaseValue,
      currency: "INR",
      num_items: 1,
      order_id: orderId,
    },
    { eventID: orderId }
  );

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(storageKey, "true");
      sessionStorage.setItem(storageKey, "true");
    } catch (e) {}
  }
}

