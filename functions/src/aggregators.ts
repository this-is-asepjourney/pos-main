import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

export const onTransactionCreated = onDocumentCreated(
  {
    document: "tenants/{tid}/transactions/{txid}",
    region: "asia-southeast1",
  },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const { tid } = event.params;
    const dateKey: string = data.dateKey ?? new Date().toISOString().slice(0, 10);
    const branchId: string = data.branchId ?? "main";
    const docId = `${dateKey}_${branchId}`;
    const totalPrice = Number(data.totalPrice ?? 0);
    const paymentMethod = data.paymentMethod ?? "cash";

    await getFirestore()
      .doc(`tenants/${tid}/reports_daily/${docId}`)
      .set(
        {
          dateKey,
          branchId,
          revenue: FieldValue.increment(totalPrice),
          txCount: FieldValue.increment(1),
          cashTotal: FieldValue.increment(paymentMethod === "cash" ? totalPrice : 0),
          qrisTotal: FieldValue.increment(paymentMethod === "qris" ? totalPrice : 0),
          debitTotal: FieldValue.increment(paymentMethod === "debit" ? totalPrice : 0),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
  },
);
