/**
 * auth.js - Authentication module
 * Handles login, signup, and session management using localStorage
 */

const Auth = (() => {

  const USERS_KEY = 'ledger_users';
  const SESSION_KEY = 'ledger_session';

  // Get all users from storage
  function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  }

  // Save users to storage
  function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  // Get current session
  function getSession() {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  }

  // Check if user is logged in
  function isLoggedIn() {
    return getSession() !== null;
  }

  // Redirect to login if not authenticated
  function requireAuth() {
    if (!isLoggedIn()) {
      window.location.href = 'index.html';
    }
  }

  // Redirect to customers if already logged in
  function redirectIfLoggedIn() {
    if (isLoggedIn()) {
      window.location.href = 'customers.html';
    }
  }

  // Login user
  function login(email, password) {
    const users = getUsers();
    const user = users.find(u => u.email === email.trim().toLowerCase() && u.password === btoa(password));
    if (!user) return { success: false, message: 'Invalid email or password' };
    
    // Make sure to load their plan into the session when they log back in!
    localStorage.setItem(SESSION_KEY, JSON.stringify({ 
      id: user.id, 
      name: user.name, 
      email: user.email, 
      business: user.business,
      plan: user.plan || 'basic' 
    }));
    return { success: true };
  }

  // Signup user
  // Update existing signup to include role
  function signup(name, email, password, business) {
    const users = getUsers();
    const exists = users.find(u => u.email === email.trim().toLowerCase());
    if (exists) return { success: false, message: 'Email already registered' };

    const newUser = {
      id: 'owner_' + Date.now(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: btoa(password),
      business: business || name.trim() + "'s Business",
      plan: 'basic', 
      role: 'owner', // <-- NEW
      createdAt: new Date().toISOString()
    };
    users.push(newUser);
    saveUsers(users);

    localStorage.setItem(SESSION_KEY, JSON.stringify({
      id: newUser.id, name: newUser.name, email: newUser.email, 
      business: newUser.business, plan: newUser.plan, role: newUser.role
    }));
    return { success: true };
  }

  // --- NEW STAFF FUNCTIONS ---
  function addStaff(name, email, password) {
    const session = getSession();
    if (!session || session.plan !== 'advance' || session.role !== 'owner') {
      return { success: false, message: 'Unauthorized. Advance plan required.' };
    }

    const users = getUsers();
    if (users.find(u => u.email === email.trim().toLowerCase())) {
      return { success: false, message: 'Email already exists' };
    }

    const newStaff = {
      id: 'staff_' + Date.now(),
      ownerId: session.id, // Link to the owner
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: btoa(password),
      business: session.business, // Share business name
      plan: 'advance', // Inherit advance features
      role: 'staff',
      createdAt: new Date().toISOString()
    };
    
    users.push(newStaff);
    saveUsers(users);
    return { success: true };
  }

  function getStaff() {
    const session = getSession();
    if (!session) return [];
    return getUsers().filter(u => u.role === 'staff' && u.ownerId === session.id);
  }

  function removeStaff(staffId) {
    let users = getUsers();
    users = users.filter(u => u.id !== staffId);
    saveUsers(users);
  }

  // Don't forget to return these new functions at the bottom of auth.js!
  return { 
    login, signup, googleSignIn, logout, isLoggedIn, requireAuth, 
    redirectIfLoggedIn, getCurrentUser, updateBusiness, updatePlan,
    addStaff, getStaff, removeStaff // <-- ADDED HERE
  };

  // Google sign-in simulation
  function googleSignIn() {
    const mockUser = {
      id: 'google_' + Date.now(),
      name: 'Google User',
      email: 'googleuser@gmail.com',
      password: btoa('google123'),
      business: "Google User's Business",
      plan: 'basic', // Default to basic
      createdAt: new Date().toISOString()
    };
    const users = getUsers();
    let existing = users.find(u => u.email === mockUser.email);
    
    if (!existing) {
      users.push(mockUser);
      saveUsers(users);
      existing = mockUser;
    }
    
    localStorage.setItem(SESSION_KEY, JSON.stringify({ 
      id: existing.id, 
      name: existing.name, 
      email: existing.email, 
      business: existing.business,
      plan: existing.plan || 'basic'
    }));
    return { success: true };
  }

  // Logout
  function logout() {
    localStorage.removeItem(SESSION_KEY);
    window.location.href = 'index.html';
  }

  // Get current user info
  function getCurrentUser() {
    return getSession();
  }

  // Update business name in session
  function updateBusiness(businessName) {
    const session = getSession();
    if (session) {
      session.business = businessName;
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      // Also update in users array
      const users = getUsers();
      const idx = users.findIndex(u => u.id === session.id);
      if (idx !== -1) {
        users[idx].business = businessName;
        saveUsers(users);
      }
    }
  }

  // Update Subscription Plan
  function updatePlan(newPlan) {
    const session = getSession();
    if (session) {
      session.plan = newPlan;
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));

      const users = getUsers();
      const idx = users.findIndex(u => u.id === session.id);
      if (idx !== -1) {
        users[idx].plan = newPlan;
        saveUsers(users);
      }
    }
  }

  // Return exactly ONE object exposing all internal functions
  return { 
    login, 
    signup, 
    googleSignIn, 
    logout, 
    isLoggedIn, 
    requireAuth, 
    redirectIfLoggedIn, 
    getCurrentUser, 
    updateBusiness, 
    updatePlan 
  };
})();