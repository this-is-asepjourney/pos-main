import { initializeApp } from "firebase-admin/app";

initializeApp();

export { setActiveTenant, syncTenantClaims } from "./auth";
export { onTransactionCreated } from "./aggregators";
export { onMemberWritten } from "./members";
