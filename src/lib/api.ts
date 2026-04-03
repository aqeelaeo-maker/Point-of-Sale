import { db, auth } from './firebase';
import { collection, getDocs, getDoc, addDoc, setDoc, deleteDoc, doc, query, orderBy, writeBatch } from 'firebase/firestore';

const getTenantPath = (path: string) => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error('User not authenticated');
  return `stores/${uid}/${path}`;
};

// --- Allowed Emails (Admin Only) ---
export const getAllowedEmails = async () => {
  const snapshot = await getDocs(collection(db, 'allowed_emails'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addAllowedEmail = async (email: string) => {
  await setDoc(doc(db, 'allowed_emails', email), { email, addedAt: new Date().toISOString() });
  return { success: true };
};

export const removeAllowedEmail = async (email: string) => {
  await deleteDoc(doc(db, 'allowed_emails', email));
  return { success: true };
};

export const checkEmailAllowed = async (email: string) => {
  if (email === 'aqeelaeo@gmail.com') return true;
  const docRef = await getDoc(doc(db, 'allowed_emails', email));
  return docRef.exists();
};

// --- Products ---
export const getProducts = async () => {
  const snapshot = await getDocs(collection(db, getTenantPath('products')));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addProduct = async (product) => {
  const docRef = await addDoc(collection(db, getTenantPath('products')), product);
  return { id: docRef.id };
};

export const addProductsBulk = async (products) => {
  const batch = writeBatch(db);
  products.forEach(p => {
    const docRef = doc(collection(db, getTenantPath('products')));
    batch.set(docRef, {
      name: String(p.Name || p.name || 'Unknown'),
      barcode: String(p.Barcode || p.barcode || ''),
      unit: String(p.Unit || p.unit || 'piece'),
      cost_price: Number(p['Cost Price'] || p.cost_price || 0),
      price_per_unit: Number(p['Selling Price'] || p.price_per_unit || 0),
      stock: Number(p['Initial Stock'] || p.stock || 0),
      batch_number: String(p['Batch Number'] || p.batch_number || ''),
      expiry_date: String(p['Expiry Date'] || p.expiry_date || '')
    });
  });
  await batch.commit();
  return { success: true };
};

// --- Customers ---
export const getCustomers = async () => {
  const snapshot = await getDocs(collection(db, getTenantPath('customers')));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addCustomer = async (customer) => {
  const docRef = await addDoc(collection(db, getTenantPath('customers')), { ...customer, loan_balance: customer.loan_balance || 0 });
  return { id: docRef.id };
};

// --- Vendors ---
export const getVendors = async () => {
  const snapshot = await getDocs(collection(db, getTenantPath('vendors')));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addVendor = async (vendor) => {
  const docRef = await addDoc(collection(db, getTenantPath('vendors')), { ...vendor, balance: vendor.balance || 0 });
  return { id: docRef.id };
};

// --- Sales ---
export const getSales = async () => {
  const snapshot = await getDocs(collection(db, getTenantPath('sales')));
  const sales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getSaleById = async (id) => {
  const saleDoc = await getDoc(doc(db, getTenantPath(`sales/${id}`)));
  if (!saleDoc.exists()) throw new Error('Sale not found');
  
  const itemsSnapshot = await getDocs(collection(db, getTenantPath(`sales/${id}/items`)));
  const items = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  return { id: saleDoc.id, ...saleDoc.data(), items };
};

export const addSale = async (saleData) => {
  const batch = writeBatch(db);
  
  // Create sale
  const saleRef = doc(collection(db, getTenantPath('sales')));
  let previousLoan = 0;

  if (saleData.customer_id) {
    const customerRef = doc(db, getTenantPath(`customers/${saleData.customer_id}`));
    const customerDoc = await getDoc(customerRef);
    if (customerDoc.exists()) {
      previousLoan = customerDoc.data().loan_balance || 0;
    }
  }

  batch.set(saleRef, {
    customer_id: saleData.customer_id,
    total_amount: saleData.total_amount,
    paid_amount: saleData.paid_amount,
    previous_loan: previousLoan,
    total_due: saleData.total_amount + previousLoan,
    date: new Date().toISOString()
  });

  // Add items
  saleData.items.forEach(item => {
    const itemRef = doc(collection(db, getTenantPath(`sales/${saleRef.id}/items`)));
    batch.set(itemRef, item);
  });

  // Update customer loan if applicable
  if (saleData.customer_id) {
    const loanAmount = saleData.total_amount - saleData.paid_amount;
    const customerRef = doc(db, getTenantPath(`customers/${saleData.customer_id}`));
    batch.update(customerRef, { loan_balance: previousLoan + loanAmount });
  }

  await batch.commit();
  return { success: true, saleId: saleRef.id };
};

// --- Settings ---
export const getSettings = async () => {
  const snapshot = await getDocs(collection(db, getTenantPath('settings')));
  const settings = {};
  snapshot.docs.forEach(doc => {
    settings[doc.id] = doc.data().value;
  });
  return settings;
};

export const getAnalytics = async () => {
  const salesSnapshot = await getDocs(collection(db, getTenantPath('sales')));
  const customersSnapshot = await getDocs(collection(db, getTenantPath('customers')));
  const vendorsSnapshot = await getDocs(collection(db, getTenantPath('vendors')));
  
  const sales = salesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  const totalLoans = customersSnapshot.docs.reduce((sum, doc) => sum + (doc.data().loan_balance || 0), 0);
  const totalVendorBalance = vendorsSnapshot.docs.reduce((sum, doc) => sum + (doc.data().balance || 0), 0);
  
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  let totalRevenue = 0;
  let totalCost = 0;
  
  const salesDataMap = {};
  
  for (const sale of sales) {
    const saleDate = new Date(sale.date);
    if (saleDate >= thirtyDaysAgo) {
      totalRevenue += sale.total_amount;
      
      const day = saleDate.toISOString().split('T')[0];
      if (!salesDataMap[day]) salesDataMap[day] = { day, revenue: 0, cost: 0 };
      salesDataMap[day].revenue += sale.total_amount;
      
      // We need to get items for cost
      const itemsSnapshot = await getDocs(collection(db, getTenantPath(`sales/${sale.id}/items`)));
      itemsSnapshot.docs.forEach(doc => {
        const item = doc.data();
        const itemCost = (item.cost_price || 0) * item.quantity;
        totalCost += itemCost;
        salesDataMap[day].cost += itemCost;
      });
    }
  }
  
  const salesData = Object.values(salesDataMap).sort((a: any, b: any) => a.day.localeCompare(b.day));
  
  return {
    totalRevenue,
    totalProfit: totalRevenue - totalCost,
    totalLoans,
    totalVendorBalance,
    salesData
  };
};

export const updateSettings = async (settings) => {
  const batch = writeBatch(db);
  Object.entries(settings).forEach(([key, value]) => {
    const docRef = doc(db, getTenantPath(`settings/${key}`));
    batch.set(docRef, { value });
  });
  await batch.commit();
  return { success: true };
};
