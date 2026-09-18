import api from "../../../../../../Services/Api";

export async function fetchAccount() {
  const response = await api.get("api/user/account/", { withCredentials: true });
  return response.data;
}

export async function updateAccount(form) {
  const response = await api.post("/api/user/update/", form, { withCredentials: true });
  return response.data;
}
