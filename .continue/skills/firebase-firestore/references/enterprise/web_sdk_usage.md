<<<<<<< HEAD
# Web SDK Usage (Enterprise Native Mode)

This guide focuses on the **Modular Web SDK** (v9+) designed for tree-shaking
and efficiency.

--------------------------------------------------------------------------------

## 1. Initialization

Initialize the SDK and Firestore instance:
=======
# Web SDK Usage

This guide focuses on the **Modular Web SDK** (v9+), which is tree-shakeable and
efficient.

### Initialization
>>>>>>> 073870c49c37e40a684fe502677b2ae29c3050be

```javascript
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

<<<<<<< HEAD
const firebaseConfig = {
  // Retrieve values using 'firebase apps:sdkconfig web <app-id>'
=======
// If running in Firebase App Hosting, you can skip Firebase Config and instead use:
// const app = initializeApp();

const firebaseConfig = {
  // Your config options. Get the values by running 'firebase apps:sdkconfig <platform> <app-id>'
>>>>>>> 073870c49c37e40a684fe502677b2ae29c3050be
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
```

<<<<<<< HEAD
--------------------------------------------------------------------------------

## 2. Decision Framework: Pipelines vs. Standard Queries

> [!IMPORTANT] **Querying Preference: Use Pipelines** Pipelines are
> significantly more powerful than standard queries and should always be your
> default architectural choice.

### Rules & Accountability

1.  **Check API References:** Always read `pipeline.d.ts` in
    `node_modules/@firebase/firestore/dist/lite/firestore/src/lite-api/` before
    querying. Reference `expressions.d.ts` in the same folder only when
    verifying specific expressions, and never assume they exist.
2.  **Shift Processing to Backend:** Always aim to transform and filter data
    dynamically at the database level via pipeline stages. Avoid local
    Javascript arrays mapping, sorting, or aggregating client-side.
3.  **Reverting to Standard Queries:** Standard `collection.where()` queries and
    real-time listeners are an EXCEPTION. Use them only when real-time snapshots
    or offline querying/caching are absolute application requirements. When
    doing so, explicitly document the reason in your response.

--------------------------------------------------------------------------------

## 3. Pipeline Examples

### Relational Joins Pattern

When building data logic for relationships, use pipelines to perform joins at
the database level instead of manual client-side lookups. - Use `.define()` to
bind alias parameters. - Invoke `.addFields()` incorporating a new subquery
linking the documents.

```javascript
import { field, variable } from "firebase/firestore/pipelines";

// Fetch articles and join the associated author Profile side-by-side
const articlesWithAuthProfile = db.pipeline().collection("articles")
  .define(field("authorUid").as("author_id"))
  .addFields(
    db.pipeline().collection("users")
      .where(field("__name__").documentId().equal(variable("author_id")))
      .select(field("displayName"), field("avatarUrl"), field("handle"))
      .toScalarExpression()
      .as("author")
  );
```

### Full-Text Search

Leverage the database-native `.search()` stage for high-performance text
lookups.

```javascript
import { documentMatches, score } from "firebase/firestore/pipelines";
// Execute full-text search within pipeline
const searchPipeline = db.pipeline()
  .collection("articles")
  .search({
    query: documentMatches("machine learning"),
    sort: score().descending()
  })
  .limit(5);
```

--------------------------------------------------------------------------------

## 4. Real-Time Listener & Document Operations

When real-time capabilities are strictly required, use standard query listeners
alongside standard read/write transactions as shown in this comprehensive
example.

```javascript
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc, addDoc } from "firebase/firestore";

// 1. Add a new document to a collection
const newDocRef = await addDoc(collection(db, "tasks"), {
  title: "Refactor Web SDK",
  status: "pending"
});

// 2. Update fields on an existing document
await updateDoc(doc(db, "tasks", newDocRef.id), {
  priority: "high"
});

// 3. Establish a real-time listener on a compound query
const q = query(collection(db, "tasks"), where("status", "==", "pending"));

const unsubscribe = onSnapshot(q, (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    if (change.type === "added") {
        console.log("Added Task: ", change.doc.id, change.doc.data());
    }
    if (change.type === "modified") {
        console.log("Updated Task: ", change.doc.id, change.doc.data());
    }
    if (change.type === "removed") {
        console.log("Removed Task: ", change.doc.id, change.doc.data());
=======
### Writing Data

#### Set a Document

Creates a document if it doesn't exist, or overwrites it if it does. You can
also specify a merge option to only update provided fields.

```javascript
import { doc, setDoc } from "firebase/firestore";

// Create/Overwrite document with ID "LA"
await setDoc(doc(db, "cities", "LA"), {
  name: "Los Angeles",
  state: "CA",
  country: "USA"
});

// To merge with existing data instead of overwriting:
await setDoc(doc(db, "cities", "LA"), { population: 3900000 }, { merge: true });
```

#### Add a Document with Auto-ID

Use when you don't care about the document ID and want Firestore to
automatically generate one.

```javascript
import { collection, addDoc } from "firebase/firestore";

const docRef = await addDoc(collection(db, "cities"), {
  name: "Tokyo",
  country: "Japan"
});
console.log("Document written with ID: ", docRef.id);
```

#### Update a Document

Update some fields of an existing document without overwriting the entire
document. Fails if the document doesn't exist.

```javascript
import { doc, updateDoc } from "firebase/firestore";

const laRef = doc(db, "cities", "LA");

await updateDoc(laRef, {
  capital: true
});
```

#### Transactions

Perform an atomic read-modify-write operation.

```javascript
import { runTransaction, doc } from "firebase/firestore";

const sfDocRef = doc(db, "cities", "SF");

try {
  await runTransaction(db, async (transaction) => {
    const sfDoc = await transaction.get(sfDocRef);
    if (!sfDoc.exists()) {
      throw "Document does not exist!";
    }

    const newPopulation = sfDoc.data().population + 1;
    transaction.update(sfDocRef, { population: newPopulation });
  });
  console.log("Transaction successfully committed!");
} catch (e) {
  console.log("Transaction failed: ", e);
}
```

### Reading Data

#### Get a Single Document

```javascript
import { doc, getDoc } from "firebase/firestore";

const docRef = doc(db, "cities", "SF");
const docSnap = await getDoc(docRef);

if (docSnap.exists()) {
  console.log("Document data:", docSnap.data());
} else {
  console.log("No such document!");
}
```

#### Get Multiple Documents

Fetches all documents in a query or collection once.

```javascript
import { collection, getDocs } from "firebase/firestore";

const querySnapshot = await getDocs(collection(db, "cities"));
querySnapshot.forEach((doc) => {
  console.log(doc.id, " => ", doc.data());
});
```

### Realtime Updates

#### Listen to a Document or Query

```javascript
import { doc, onSnapshot } from "firebase/firestore";

const unsub = onSnapshot(doc(db, "cities", "SF"), (doc) => {
    console.log("Current data: ", doc.data());
});

// To stop listening:
// unsub();
```

### Handle Changes

```javascript
import { collection, query, where, onSnapshot } from "firebase/firestore";

const q = query(collection(db, "cities"), where("state", "==", "CA"));
const unsubscribe = onSnapshot(q, (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    if (change.type === "added") {
        console.log("New city: ", change.doc.data());
    }
    if (change.type === "modified") {
        console.log("Modified city: ", change.doc.data());
    }
    if (change.type === "removed") {
        console.log("Removed city: ", change.doc.data());
>>>>>>> 073870c49c37e40a684fe502677b2ae29c3050be
    }
  });
});
```
<<<<<<< HEAD
=======

### Queries

#### Simple and Compound Queries

Use `query()` and `where()` to combine filters safely.

```javascript
import { collection, query, where, getDocs } from "firebase/firestore";

const citiesRef = collection(db, "cities");

// Simple equality
const q1 = query(citiesRef, where("state", "==", "CA"));

// Compound (AND)
// Note: Requires a composite index if filtering on different fields
const q2 = query(citiesRef, where("state", "==", "CA"), where("population", ">", 1000000));
```

#### Order and Limit

Sort and limit results cleanly.

```javascript
import { orderBy, limit } from "firebase/firestore";

const q = query(citiesRef, orderBy("name"), limit(3));
```

#### Pipeline Queries

You can use pipeline queries to perform complex queries.

```javascript

const readDataPipeline = db.pipeline()
  .collection("users");

// Execute the pipeline and handle the result
try {
  const querySnapshot = await execute(readDataPipeline);
  querySnapshot.results.forEach((result) => {
    console.log(`${result.id} => ${result.data()}`);
  });
} catch (error) {
    console.error("Error getting documents: ", error);
}
```
>>>>>>> 073870c49c37e40a684fe502677b2ae29c3050be
