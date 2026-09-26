import { LightningElement, wire } from "lwc";
import { getRecord, getFieldValue } from "lightning/uiRecordApi";
import USER_ID from "@salesforce/user/Id";
import NAME_FIELD from "@salesforce/schema/User.Name";
import EMAIL_FIELD from "@salesforce/schema/User.Email";
import USERNAME_FIELD from "@salesforce/schema/User.Username";
import TITLE_FIELD from "@salesforce/schema/User.Title";
import COMPANY_FIELD from "@salesforce/schema/User.CompanyName";
import PROFILE_FIELD from "@salesforce/schema/User.Profile.Name";

const USER_FIELDS = [
  NAME_FIELD,
  EMAIL_FIELD,
  USERNAME_FIELD,
  TITLE_FIELD,
  COMPANY_FIELD,
  PROFILE_FIELD
];
const EMPTY_VALUE = "—";
const SKELETON_ROW_COUNT = 4;

export default class SgwHello extends LightningElement {
  user;
  error;

  @wire(getRecord, { recordId: USER_ID, fields: USER_FIELDS })
  wiredUser({ data, error }) {
    this.user = data;
    this.error = error;
  }

  get isLoading() {
    return !this.user && !this.error;
  }

  get hasUser() {
    return !!this.user;
  }

  get hasError() {
    return !!this.error;
  }

  get errorMessage() {
    return this.error?.body?.message ?? "Unable to load your Salesforce profile.";
  }

  get skeletonRows() {
    return Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => ({ id: i }));
  }

  get name() {
    return getFieldValue(this.user, NAME_FIELD) ?? EMPTY_VALUE;
  }

  get subtitle() {
    const title = getFieldValue(this.user, TITLE_FIELD);
    const company = getFieldValue(this.user, COMPANY_FIELD);
    return [title, company].filter(Boolean).join(" · ") || "Salesforce user";
  }

  get initials() {
    const parts = String(getFieldValue(this.user, NAME_FIELD) ?? "").split(" ");
    return parts
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join("");
  }

  get details() {
    return [
      { label: "Username", value: getFieldValue(this.user, USERNAME_FIELD) },
      { label: "Email", value: getFieldValue(this.user, EMAIL_FIELD) },
      { label: "Profile", value: getFieldValue(this.user, PROFILE_FIELD) },
      { label: "User Id", value: USER_ID }
    ].map((d) => ({ ...d, value: d.value ?? EMPTY_VALUE }));
  }
}
