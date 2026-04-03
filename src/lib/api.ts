import { db } from './firebase';
import { collection, getDocs, getDoc, addDoc, setDoc, doc, query, orderBy, writeBatch } from 'firebase/firestore';

// --- Products ---
export const getProducts = async () => {
  const snapshot = await getDocs(collection(db, 'products'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addProduct = async (product) => {
  const docRef = await addDoc(collection(db, 'products'), product);
  return { id: docRef.id };
};

export const addProductsBulk = async (products) => {
  const batch = writeBatch(db);
  products.forEach(p => {
    const docRef = doc(collection(db, 'products'));
    batch.set(docRef, {
      name: p.Name || p.name || 'Unknown',
      barcode: p.Barcode || p.barcode || '',
      unit: p.Unit || p.unit || 'piece',
      cost_price: Number(p['Cost Price'] || p.cost_price || 0),
      price_per_unit: Number(p['Selling Price'] || p.price_per_unit || 0),
      stock: Number(p['Initial Stock'] || p.stock || 0),
      batch_number: p['Batch Number'] || p.batch_number || '',
      expiry_date: p['Expiry Date'] || p.expiry_date || ''
    });
  });
  await batch.commit();
  return { success: true };
};

// --- Customers ---
export const getCustomers = async () => {
  const snapshot = await getDocs(collection(db, 'customers'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addCustomer = async (customer) => {
  const docRef = await addDoc(collection(db, 'customers'), { ...customer, loan_balance: customer.loan_balance || 0 });
  return { id: docRef.id };
};

// --- Vendors ---
export const getVendors = async () => {
  const snapshot = await getDocs(collection(db, 'vendors'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const addVendor = async (vendor) => {
  const docRef = await addDoc(collection(db, 'vendors'), { ...vendor, balance: vendor.balance || 0 });
  return { id: docRef.id };
};

// --- Sales ---
export const getSales = async () => {
  const snapshot = await getDocs(collection(db, 'sales'));
  const sales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getSaleById = async (id) => {
  const saleDoc = await getDoc(doc(db, 'sales', id));
  if (!saleDoc.exists()) throw new Error('Sale not found');
  
  const itemsSnapshot = await getDocs(collection(db, `sales/${id}/items`));
  const items = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  return { id: saleDoc.id, ...saleDoc.data(), items };
};

export const addSale = async (saleData) => {
  const batch = writeBatch(db);
  
  // Create sale
  const saleRef = doc(collection(db, 'sales'));
  let previousLoan = 0;

  if (saleData.customer_id) {
    const customerRef = doc(db, 'customers', saleData.customer_id);
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
    const itemRef = doc(collection(db, `sales/${saleRef.id}/items`));
    batch.set(itemRef, item);
  });

  // Update customer loan if applicable
  if (saleData.customer_id) {
    const loanAmount = saleData.total_amount - saleData.paid_amount;
    const customerRef = doc(db, 'customers', saleData.customer_id);
    batch.update(customerRef, { loan_balance: previousLoan + loanAmount });
  }

  await batch.commit();
  return { success: true, saleId: saleRef.id };
};

// --- Settings ---
export const getSettings = async () => {
  const snapshot = await getDocs(collection(db, 'settings'));
  const settings = {};
  snapshot.docs.forEach(doc => {
    settings[doc.id] = doc.data().value;
  });
  return settings;
};

export const getAnalytics = async () => {
  const salesSnapshot = await getDocs(collection(db, 'sales'));
  const customersSnapshot = await getDocs(collection(db, 'customers'));
  const vendorsSnapshot = await getDocs(collection(db, 'vendors'));
  
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
      const itemsSnapshot = await getDocs(collection(db, `sales/${sale.id}/items`));
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
    const docRef = doc(db, 'settings', key);
    batch.set(docRef, { value });
  });
  await batch.commit();
  return { success: true };
};
