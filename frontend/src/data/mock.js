// Mock Data for Maropost Clone

// Platform Statistics (Admin View)
export const platformStats = {
  totalMerchants: 1247,
  activeMerchants: 1089,
  totalRevenue: 2847563.45,
  totalOrders: 45892,
  monthlyGrowth: 12.5,
  conversionRate: 3.8
};

// Merchants List (Admin View)
export const merchants = [
  {
    id: 'm1',
    name: 'TechGear Pro',
    email: 'admin@techgearpro.com',
    status: 'active',
    plan: 'Enterprise',
    revenue: 458920.50,
    orders: 2341,
    products: 156,
    joinedDate: '2024-01-15',
    logo: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=100&h=100&fit=crop'
  },
  {
    id: 'm2',
    name: 'Fashion Hub',
    email: 'contact@fashionhub.com',
    status: 'active',
    plan: 'Professional',
    revenue: 325680.75,
    orders: 4521,
    products: 892,
    joinedDate: '2024-02-20',
    logo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=100&h=100&fit=crop'
  },
  {
    id: 'm3',
    name: 'Home Essentials',
    email: 'info@homeessentials.com',
    status: 'active',
    plan: 'Starter',
    revenue: 89450.25,
    orders: 1256,
    products: 234,
    joinedDate: '2024-03-10',
    logo: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=100&h=100&fit=crop'
  },
  {
    id: 'm4',
    name: 'Sports World',
    email: 'sales@sportsworld.com',
    status: 'suspended',
    plan: 'Professional',
    revenue: 156780.00,
    orders: 2890,
    products: 445,
    joinedDate: '2024-01-28',
    logo: 'https://images.unsplash.com/photo-1461896836934- voices?w=100&h=100&fit=crop'
  },
  {
    id: 'm5',
    name: 'Beauty Plus',
    email: 'hello@beautyplus.com',
    status: 'active',
    plan: 'Enterprise',
    revenue: 567890.30,
    orders: 8934,
    products: 1245,
    joinedDate: '2023-11-05',
    logo: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=100&h=100&fit=crop'
  }
];

// Merchant Dashboard Stats
export const merchantStats = {
  todaySales: 12458.90,
  weekSales: 78945.50,
  monthSales: 325680.75,
  totalOrders: 4521,
  pendingOrders: 45,
  completedOrders: 4412,
  cancelledOrders: 64,
  totalCustomers: 2847,
  newCustomers: 156,
  returningCustomers: 2691,
  conversionRate: 4.2,
  averageOrderValue: 72.05
};

// Sales Chart Data
export const salesChartData = [
  { date: 'Mon', sales: 4200, orders: 58 },
  { date: 'Tue', sales: 5100, orders: 71 },
  { date: 'Wed', sales: 4800, orders: 64 },
  { date: 'Thu', sales: 6200, orders: 89 },
  { date: 'Fri', sales: 7500, orders: 102 },
  { date: 'Sat', sales: 8900, orders: 125 },
  { date: 'Sun', sales: 6800, orders: 94 }
];

// Monthly Revenue Data
export const monthlyRevenueData = [
  { month: 'Jan', revenue: 245000 },
  { month: 'Feb', revenue: 278000 },
  { month: 'Mar', revenue: 312000 },
  { month: 'Apr', revenue: 298000 },
  { month: 'May', revenue: 356000 },
  { month: 'Jun', revenue: 389000 },
  { month: 'Jul', revenue: 325680 }
];

// Orders (Merchant View)
export const orders = [
  {
    id: 'ORD-2024-001',
    customer: 'John Smith',
    email: 'john.smith@email.com',
    items: 3,
    total: 245.99,
    status: 'pending',
    paymentStatus: 'paid',
    date: '2024-07-15T10:30:00',
    shippingAddress: '123 Main St, New York, NY 10001'
  },
  {
    id: 'ORD-2024-002',
    customer: 'Sarah Johnson',
    email: 'sarah.j@email.com',
    items: 1,
    total: 89.99,
    status: 'processing',
    paymentStatus: 'paid',
    date: '2024-07-15T09:15:00',
    shippingAddress: '456 Oak Ave, Los Angeles, CA 90001'
  },
  {
    id: 'ORD-2024-003',
    customer: 'Mike Wilson',
    email: 'mike.w@email.com',
    items: 5,
    total: 567.50,
    status: 'shipped',
    paymentStatus: 'paid',
    date: '2024-07-14T16:45:00',
    shippingAddress: '789 Pine Rd, Chicago, IL 60601'
  },
  {
    id: 'ORD-2024-004',
    customer: 'Emily Davis',
    email: 'emily.d@email.com',
    items: 2,
    total: 156.00,
    status: 'delivered',
    paymentStatus: 'paid',
    date: '2024-07-13T11:20:00',
    shippingAddress: '321 Elm St, Houston, TX 77001'
  },
  {
    id: 'ORD-2024-005',
    customer: 'David Brown',
    email: 'david.b@email.com',
    items: 4,
    total: 423.75,
    status: 'cancelled',
    paymentStatus: 'refunded',
    date: '2024-07-12T14:00:00',
    shippingAddress: '654 Maple Dr, Phoenix, AZ 85001'
  },
  {
    id: 'ORD-2024-006',
    customer: 'Lisa Anderson',
    email: 'lisa.a@email.com',
    items: 2,
    total: 189.50,
    status: 'pending',
    paymentStatus: 'pending',
    date: '2024-07-15T11:45:00',
    shippingAddress: '987 Cedar Ln, Seattle, WA 98101'
  }
];

// Products (Merchant & Store)
export const products = [
  {
    id: 'p1',
    name: 'Wireless Bluetooth Headphones',
    description: 'Premium noise-cancelling wireless headphones with 30-hour battery life. Features active noise cancellation, comfortable over-ear design, and crystal-clear audio quality.',
    price: 149.99,
    comparePrice: 199.99,
    category: 'Electronics',
    subcategory: 'Audio',
    stock: 156,
    sku: 'WBH-001',
    status: 'active',
    images: [
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop',
      'https://images.unsplash.com/photo-1484704849700-f032a568e944?w=500&h=500&fit=crop'
    ],
    rating: 4.8,
    reviews: 234,
    sales: 1456
  },
  {
    id: 'p2',
    name: 'Smart Watch Pro',
    description: 'Advanced smartwatch with health monitoring, GPS tracking, and 7-day battery life. Water-resistant design with customizable watch faces.',
    price: 299.99,
    comparePrice: 349.99,
    category: 'Electronics',
    subcategory: 'Wearables',
    stock: 89,
    sku: 'SWP-002',
    status: 'active',
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&h=500&fit=crop'
    ],
    rating: 4.6,
    reviews: 189,
    sales: 892
  },
  {
    id: 'p3',
    name: 'Leather Laptop Bag',
    description: 'Handcrafted genuine leather laptop bag with padded compartment for 15-inch laptops. Multiple pockets for accessories and documents.',
    price: 89.99,
    comparePrice: 129.99,
    category: 'Accessories',
    subcategory: 'Bags',
    stock: 234,
    sku: 'LLB-003',
    status: 'active',
    images: [
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&h=500&fit=crop'
    ],
    rating: 4.9,
    reviews: 456,
    sales: 2341
  },
  {
    id: 'p4',
    name: 'Minimalist Desk Lamp',
    description: 'Modern LED desk lamp with adjustable brightness and color temperature. Touch controls and USB charging port included.',
    price: 59.99,
    comparePrice: null,
    category: 'Home & Office',
    subcategory: 'Lighting',
    stock: 67,
    sku: 'MDL-004',
    status: 'active',
    images: [
      'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=500&h=500&fit=crop'
    ],
    rating: 4.5,
    reviews: 123,
    sales: 567
  },
  {
    id: 'p5',
    name: 'Premium Cotton T-Shirt',
    description: '100% organic cotton t-shirt with a modern fit. Pre-shrunk fabric for lasting comfort and durability.',
    price: 34.99,
    comparePrice: 44.99,
    category: 'Clothing',
    subcategory: 'Tops',
    stock: 445,
    sku: 'PCT-005',
    status: 'active',
    images: [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500&h=500&fit=crop'
    ],
    rating: 4.7,
    reviews: 678,
    sales: 3456
  },
  {
    id: 'p6',
    name: 'Portable Power Bank',
    description: '20000mAh portable charger with fast charging support. Dual USB ports and LED power indicator.',
    price: 49.99,
    comparePrice: 69.99,
    category: 'Electronics',
    subcategory: 'Accessories',
    stock: 12,
    sku: 'PPB-006',
    status: 'low_stock',
    images: [
      'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=500&h=500&fit=crop'
    ],
    rating: 4.4,
    reviews: 234,
    sales: 1234
  },
  {
    id: 'p7',
    name: 'Ceramic Coffee Mug Set',
    description: 'Set of 4 handcrafted ceramic mugs in assorted colors. Microwave and dishwasher safe.',
    price: 39.99,
    comparePrice: null,
    category: 'Home & Office',
    subcategory: 'Kitchen',
    stock: 0,
    sku: 'CCM-007',
    status: 'out_of_stock',
    images: [
      'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=500&h=500&fit=crop'
    ],
    rating: 4.8,
    reviews: 89,
    sales: 456
  },
  {
    id: 'p8',
    name: 'Running Shoes Ultra',
    description: 'Lightweight running shoes with responsive cushioning and breathable mesh upper. Perfect for daily runs and training.',
    price: 129.99,
    comparePrice: 159.99,
    category: 'Sports',
    subcategory: 'Footwear',
    stock: 178,
    sku: 'RSU-008',
    status: 'active',
    images: [
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500&h=500&fit=crop'
    ],
    rating: 4.6,
    reviews: 345,
    sales: 1678
  }
];

// Categories
export const categories = [
  { id: 'c1', name: 'Electronics', count: 156, icon: 'Cpu' },
  { id: 'c2', name: 'Clothing', count: 892, icon: 'Shirt' },
  { id: 'c3', name: 'Home & Office', count: 234, icon: 'Home' },
  { id: 'c4', name: 'Sports', count: 445, icon: 'Dumbbell' },
  { id: 'c5', name: 'Accessories', count: 567, icon: 'Watch' },
  { id: 'c6', name: 'Beauty', count: 321, icon: 'Sparkles' }
];

// Customers (Merchant View)
export const customers = [
  {
    id: 'cust1',
    name: 'John Smith',
    email: 'john.smith@email.com',
    phone: '+1 (555) 123-4567',
    totalOrders: 12,
    totalSpent: 1456.78,
    lastOrder: '2024-07-15',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop'
  },
  {
    id: 'cust2',
    name: 'Sarah Johnson',
    email: 'sarah.j@email.com',
    phone: '+1 (555) 234-5678',
    totalOrders: 8,
    totalSpent: 892.50,
    lastOrder: '2024-07-14',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop'
  },
  {
    id: 'cust3',
    name: 'Mike Wilson',
    email: 'mike.w@email.com',
    phone: '+1 (555) 345-6789',
    totalOrders: 23,
    totalSpent: 3456.90,
    lastOrder: '2024-07-13',
    status: 'vip',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop'
  },
  {
    id: 'cust4',
    name: 'Emily Davis',
    email: 'emily.d@email.com',
    phone: '+1 (555) 456-7890',
    totalOrders: 5,
    totalSpent: 567.25,
    lastOrder: '2024-07-10',
    status: 'active',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop'
  },
  {
    id: 'cust5',
    name: 'David Brown',
    email: 'david.b@email.com',
    phone: '+1 (555) 567-8901',
    totalOrders: 2,
    totalSpent: 189.00,
    lastOrder: '2024-06-28',
    status: 'inactive',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop'
  }
];

// Inventory Data
export const inventory = [
  { sku: 'WBH-001', name: 'Wireless Bluetooth Headphones', stock: 156, reorderLevel: 50, location: 'Warehouse A', lastUpdated: '2024-07-15' },
  { sku: 'SWP-002', name: 'Smart Watch Pro', stock: 89, reorderLevel: 30, location: 'Warehouse A', lastUpdated: '2024-07-15' },
  { sku: 'LLB-003', name: 'Leather Laptop Bag', stock: 234, reorderLevel: 75, location: 'Warehouse B', lastUpdated: '2024-07-14' },
  { sku: 'MDL-004', name: 'Minimalist Desk Lamp', stock: 67, reorderLevel: 40, location: 'Warehouse A', lastUpdated: '2024-07-15' },
  { sku: 'PCT-005', name: 'Premium Cotton T-Shirt', stock: 445, reorderLevel: 100, location: 'Warehouse C', lastUpdated: '2024-07-13' },
  { sku: 'PPB-006', name: 'Portable Power Bank', stock: 12, reorderLevel: 50, location: 'Warehouse A', lastUpdated: '2024-07-15' },
  { sku: 'CCM-007', name: 'Ceramic Coffee Mug Set', stock: 0, reorderLevel: 25, location: 'Warehouse B', lastUpdated: '2024-07-12' },
  { sku: 'RSU-008', name: 'Running Shoes Ultra', stock: 178, reorderLevel: 60, location: 'Warehouse C', lastUpdated: '2024-07-14' }
];

// Recent Activity
export const recentActivity = [
  { id: 1, type: 'order', message: 'New order #ORD-2024-001 received', time: '5 minutes ago', icon: 'ShoppingCart' },
  { id: 2, type: 'customer', message: 'New customer registered: Lisa Anderson', time: '15 minutes ago', icon: 'UserPlus' },
  { id: 3, type: 'product', message: 'Low stock alert: Portable Power Bank', time: '1 hour ago', icon: 'AlertTriangle' },
  { id: 4, type: 'order', message: 'Order #ORD-2024-003 shipped', time: '2 hours ago', icon: 'Truck' },
  { id: 5, type: 'review', message: 'New 5-star review for Wireless Headphones', time: '3 hours ago', icon: 'Star' },
  { id: 6, type: 'payment', message: 'Payment received for #ORD-2024-002', time: '4 hours ago', icon: 'CreditCard' }
];

// Top Products
export const topProducts = [
  { id: 'p5', name: 'Premium Cotton T-Shirt', sales: 3456, revenue: 120946.44, trend: 12 },
  { id: 'p3', name: 'Leather Laptop Bag', sales: 2341, revenue: 210667.59, trend: 8 },
  { id: 'p8', name: 'Running Shoes Ultra', sales: 1678, revenue: 218114.22, trend: 15 },
  { id: 'p1', name: 'Wireless Bluetooth Headphones', sales: 1456, revenue: 218405.44, trend: -3 },
  { id: 'p6', name: 'Portable Power Bank', sales: 1234, revenue: 61687.66, trend: 5 }
];

// Store Settings
export const storeSettings = {
  name: 'Fashion Hub',
  logo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200&h=200&fit=crop',
  tagline: 'Your one-stop shop for premium fashion',
  email: 'contact@fashionhub.com',
  phone: '+1 (555) 123-4567',
  address: '123 Commerce Street, New York, NY 10001',
  currency: 'USD',
  timezone: 'America/New_York'
};

// Cart Items (for storefront)
export const cartItems = [
  {
    id: 'p1',
    name: 'Wireless Bluetooth Headphones',
    price: 149.99,
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&h=500&fit=crop'
  },
  {
    id: 'p3',
    name: 'Leather Laptop Bag',
    price: 89.99,
    quantity: 2,
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=500&h=500&fit=crop'
  }
];
