"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onTransactionCreated = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const firestore_2 = require("firebase-admin/firestore");
exports.onTransactionCreated = (0, firestore_1.onDocumentCreated)({
    document: "tenants/{tid}/transactions/{txid}",
    region: "asia-southeast1",
}, async (event) => {
    const data = event.data?.data();
    if (!data)
        return;
    const { tid } = event.params;
    const dateKey = data.dateKey ?? new Date().toISOString().slice(0, 10);
    const branchId = data.branchId ?? "main";
    const docId = `${dateKey}_${branchId}`;
    const totalPrice = Number(data.totalPrice ?? 0);
    const paymentMethod = data.paymentMethod ?? "cash";
    await (0, firestore_2.getFirestore)()
        .doc(`tenants/${tid}/reports_daily/${docId}`)
        .set({
        dateKey,
        branchId,
        revenue: firestore_2.FieldValue.increment(totalPrice),
        txCount: firestore_2.FieldValue.increment(1),
        cashTotal: firestore_2.FieldValue.increment(paymentMethod === "cash" ? totalPrice : 0),
        qrisTotal: firestore_2.FieldValue.increment(paymentMethod === "qris" ? totalPrice : 0),
        debitTotal: firestore_2.FieldValue.increment(paymentMethod === "debit" ? totalPrice : 0),
        updatedAt: firestore_2.FieldValue.serverTimestamp(),
    }, { merge: true });
});
