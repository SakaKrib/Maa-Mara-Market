import { useEffect, useState } from "react";
import api from "./Api";

// Shown until the server answers, and if it cannot be reached.
export const DEFAULT_CONTACT = {
  email: "maamaramarket@gmail.com",
  phone: "+254 712 345 678",
  location: "Nairobi, Kenya · East Africa",
};

let contactCache = null;
let contactRequest = null;

export const setSiteContactCache = (value) => {
  contactCache = value ? { ...DEFAULT_CONTACT, ...value } : null;
};

export const phoneHref = (phone) => {
  const digits = String(phone || "").replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : "";
};

export const mailHref = (email, subject) =>
  email ? `mailto:${email}${subject ? `?subject=${encodeURIComponent(subject)}` : ""}` : "";

/** Footer contact details, edited by administrators in Settings. */
export function useSiteContact() {
  const [contact, setContact] = useState(contactCache || DEFAULT_CONTACT);

  useEffect(() => {
    let active = true;
    if (!contactCache) {
      contactRequest = contactRequest || api.get("/api/site-contact/")
        .then((response) => {
          contactCache = {
            email: response.data?.email ?? "",
            phone: response.data?.phone ?? "",
            location: response.data?.location ?? "",
          };
          return contactCache;
        })
        .catch(() => null)
        .finally(() => { contactRequest = null; });
      contactRequest.then((value) => { if (active && value) setContact(value); });
    }
    return () => { active = false; };
  }, []);

  return contact;
}

let collectionsCache = null;
let collectionsRequest = null;

/** Collections menu (Women, Men, Sports, Children, Unisex) with real "new" flags. */
export function useCollections() {
  const [state, setState] = useState({ collections: collectionsCache || [], loading: !collectionsCache });

  useEffect(() => {
    let active = true;
    collectionsRequest = collectionsRequest || api.get("/api/collections/")
      .then((response) => response.data?.collections || [])
      .catch(() => null)
      .finally(() => { collectionsRequest = null; });
    collectionsRequest.then((list) => {
      if (!active) return;
      if (list) collectionsCache = list;
      setState({ collections: list || collectionsCache || [], loading: false });
    });
    return () => { active = false; };
  }, []);

  return state;
}
