/* Homely App - Logic & State Management */

// --- Constants & Config ---
const SCALE = 40; // 1 meter = 40 pixels
const SNAP_GRID = 10; // Pixel snapping grid
const DEFAULT_HOUSE_CODE = "HOME-9842";

// --- Application State ---
let state = {
    syncCode: DEFAULT_HOUSE_CODE,
    currentMemberId: "", // Set dynamically on load
    members: [],
    rooms: [],
    items: [],
    tasks: [],
    boxes: [],
    requests: [],
    notifications: [],
    selectedRoomId: null,
    selectedItemId: null
};

// --- Default/Demo Data Sets ---
const DEFAULT_MEMBERS = [
    { id: "mem-1", name: "Madre (Admin)", avatar: "madre", role: "Admin" },
    { id: "mem-2", name: "Hijo", avatar: "hijo", role: "Miembro" },
    { id: "mem-3", name: "Padre", avatar: "padre", role: "Miembro" }
];

const CATALOG_ITEMS = {
    furniture: [
        { name: "Cama Doble", width: 2.0, height: 2.0, icon: "fa-bed", type: "furniture" },
        { name: "Sofá Confort", width: 2.2, height: 1.0, icon: "fa-couch", type: "furniture" },
        { name: "Mesa Comedor", width: 1.8, height: 1.0, icon: "fa-table", type: "furniture" },
        { name: "Escritorio Trabajo", width: 1.4, height: 0.8, icon: "fa-laptop", type: "furniture" },
        { name: "Armario", width: 1.6, height: 0.6, icon: "fa-door-closed", type: "furniture" },
        { name: "Silla Comedor", width: 0.5, height: 0.5, icon: "fa-chair", type: "furniture" },
        { name: "Encimera Cocina", width: 2.0, height: 0.7, icon: "fa-sink", type: "furniture" }
    ],
    plants: [
        { name: "Ficus Grande", width: 1.0, height: 1.0, icon: "fa-leaf", type: "plant" },
        { name: "Helecho Colgante", width: 0.8, height: 0.8, icon: "fa-leaf", type: "plant" },
        { name: "Cactus Maceta", width: 0.5, height: 0.5, icon: "fa-leaf", type: "plant" },
        { name: "Monstera Elegante", width: 1.2, height: 1.2, icon: "fa-leaf", type: "plant" }
    ]
};

// --- Initialization ---
document.addEventListener("DOMContentLoaded", () => {
    initApp();
    setupEventListeners();
});

function initApp() {
    // Load household code
    const savedCode = localStorage.getItem("homely_sync_code");
    state.syncCode = savedCode || DEFAULT_HOUSE_CODE;
    
    // Load state from localStorage based on active sync code
    loadStateFromStorage();

    // Default profiles if empty
    if (state.members.length === 0) {
        state.members = JSON.parse(JSON.stringify(DEFAULT_MEMBERS));
    }
    
    // Set default active member if not set
    if (!state.currentMemberId || !state.members.find(m => m.id === state.currentMemberId)) {
        state.currentMemberId = state.members[0].id;
    }

    // Refresh UI
    updateSyncCodeDisplay();
    populateProfileSelector();
    renderAllViews();
    
    // Auto-scroll notifications list
    const notifList = document.getElementById("sidebarNotificationsList");
    if (notifList) notifList.scrollTop = notifList.scrollHeight;
}

// --- LocalStorage Integration ---
function loadStateFromStorage() {
    const keyPrefix = `homely_data_${state.syncCode}_`;
    
    state.rooms = JSON.parse(localStorage.getItem(keyPrefix + "rooms")) || [];
    state.items = JSON.parse(localStorage.getItem(keyPrefix + "items")) || [];
    state.tasks = JSON.parse(localStorage.getItem(keyPrefix + "tasks")) || [];
    state.boxes = JSON.parse(localStorage.getItem(keyPrefix + "boxes")) || [];
    state.requests = JSON.parse(localStorage.getItem(keyPrefix + "requests")) || [];
    state.members = JSON.parse(localStorage.getItem(keyPrefix + "members")) || [];
    state.notifications = JSON.parse(localStorage.getItem(keyPrefix + "notifications")) || [];
    
    const savedMember = localStorage.getItem(keyPrefix + "current_member_id");
    if (savedMember) state.currentMemberId = savedMember;
}

function saveStateToStorage() {
    const keyPrefix = `homely_data_${state.syncCode}_`;
    
    localStorage.setItem(keyPrefix + "rooms", JSON.stringify(state.rooms));
    localStorage.setItem(keyPrefix + "items", JSON.stringify(state.items));
    localStorage.setItem(keyPrefix + "tasks", JSON.stringify(state.tasks));
    localStorage.setItem(keyPrefix + "boxes", JSON.stringify(state.boxes));
    localStorage.setItem(keyPrefix + "requests", JSON.stringify(state.requests));
    localStorage.setItem(keyPrefix + "members", JSON.stringify(state.members));
    localStorage.setItem(keyPrefix + "notifications", JSON.stringify(state.notifications));
    localStorage.setItem(keyPrefix + "current_member_id", state.currentMemberId);
}

// --- Synthesizer for Retro Beeps & Chimes (Web Audio API) ---
function playAudioNotification(type) {
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContextClass();
        
        if (type === 'alert') {
            // High-pitched critical notification sound
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            osc.start();
            osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
            osc.stop(ctx.currentTime + 0.35);
        } else if (type === 'chime') {
            // Sweet double bell chord sound (C5 -> E5 -> G5)
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);
            
            osc1.type = 'sine';
            osc2.type = 'sine';
            
            osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
            osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
            
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            osc1.start();
            osc2.start();
            
            osc1.frequency.setValueAtTime(783.99, ctx.currentTime + 0.12); // G5
            osc2.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.12); // C6
            
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
            osc1.stop(ctx.currentTime + 0.5);
            osc2.stop(ctx.currentTime + 0.5);
        }
    } catch (e) {
        console.warn("Autoplay audio blocked or AudioContext not supported yet", e);
    }
}

// --- Notifications Engine ---
function addNotification(message, type = "info") {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const notification = {
        id: "notif-" + Date.now() + Math.random().toString(36).substr(2, 4),
        message,
        type, // 'info', 'success', 'warning', 'danger'
        time: timestamp
    };
    
    state.notifications.unshift(notification);
    if (state.notifications.length > 20) state.notifications.pop(); // Cap at 20 logs
    
    saveStateToStorage();
    renderNotifications();
    showToast(message, type);
}

function showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    
    let iconClass = "fa-circle-info";
    if (type === "success") iconClass = "fa-circle-check";
    if (type === "warning") iconClass = "fa-triangle-exclamation";
    if (type === "danger") iconClass = "fa-circle-exclamation";
    
    toast.innerHTML = `
        <i class="fa-solid ${iconClass} toast-icon"></i>
        <div class="toast-content">${message}</div>
    `;
    
    container.appendChild(toast);
    
    // Auto-remove toast after 4s
    setTimeout(() => {
        toast.style.animation = "toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards";
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// --- Profile / Device Switching Simulator ---
function populateProfileSelector() {
    const currentBtn = document.getElementById("currentProfileBtn");
    const currentAvatar = document.getElementById("currentProfileAvatar");
    const currentName = document.getElementById("currentProfileName");
    const dropdownList = document.getElementById("profileDropdownList");
    
    const activeMember = state.members.find(m => m.id === state.currentMemberId) || state.members[0];
    
    // Set current active member in DOM
    currentAvatar.src = `https://api.dicebear.com/7.x/adventurer/svg?seed=${activeMember.avatar}`;
    currentName.textContent = activeMember.name;
    document.getElementById("welcomeUserName").textContent = activeMember.name.split(" ")[0];
    
    // Build dropdown list
    dropdownList.innerHTML = "";
    state.members.forEach(member => {
        const option = document.createElement("button");
        option.className = `profile-opt ${member.id === state.currentMemberId ? 'active' : ''}`;
        option.innerHTML = `
            <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=${member.avatar}" alt="Avatar" class="avatar-img">
            <span>${member.name}</span>
        `;
        option.onclick = () => {
            selectProfile(member.id);
            dropdownList.classList.remove("show");
        };
        dropdownList.appendChild(option);
    });
}

function selectProfile(memberId) {
    state.currentMemberId = memberId;
    saveStateToStorage();
    populateProfileSelector();
    
    const member = state.members.find(m => m.id === memberId);
    showToast(`Dispositivo simula perfil de: ${member.name}`, "info");
    
    // Trigger views refresh and check for active alerts for this user
    renderAllViews();
    checkActiveAlertsForUser(memberId);
}

function checkActiveAlertsForUser(memberId) {
    // 1. Check pending urgent tasks assigned to this user
    const pendingUrgentTask = state.tasks.find(t => t.assigneeId === memberId && t.status === "pending" && t.priority === "alta");
    if (pendingUrgentTask) {
        showTaskAlertModal(pendingUrgentTask);
    }
    
    // 2. Check active pending material requests addressed to this user
    const pendingRequest = state.requests.find(r => r.receiverId === memberId && r.status === "pendiente");
    if (pendingRequest) {
        const sender = state.members.find(m => m.id === pendingRequest.senderId);
        const room = state.rooms.find(r => r.id === pendingRequest.senderRoomId);
        playAudioNotification('chime');
        showToast(`Nueva Petición: ${sender.name} necesita ${pendingRequest.material} en ${room ? room.name : "Habitación"}`, "warning");
    }
}

// --- Navigation Tab Switching ---
function setupEventListeners() {
    // Dropdown Profile Toggle
    const currentProfileBtn = document.getElementById("currentProfileBtn");
    const profileDropdownList = document.getElementById("profileDropdownList");
    
    currentProfileBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        profileDropdownList.classList.toggle("show");
    });
    
    document.addEventListener("click", () => {
        profileDropdownList.classList.remove("show");
    });

    // Sidebar Tab Clicks
    const navItems = document.querySelectorAll(".sidebar-nav .nav-item");
    navItems.forEach(item => {
        item.addEventListener("click", () => {
            const tabName = item.getAttribute("data-tab");
            switchTab(tabName);
        });
    });

    // Clear notifications log
    document.getElementById("clearNotifBtn").addEventListener("click", () => {
        state.notifications = [];
        saveStateToStorage();
        renderNotifications();
    });

    // --- Tab Planner Listeners ---
    document.getElementById("addRoomForm").addEventListener("submit", handleAddRoom);
    document.getElementById("clearPlanBtn").addEventListener("click", clearFloorPlan);
    document.getElementById("demoPlanBtn").addEventListener("click", loadDemoData);
    document.getElementById("deselectRoomBtn").addEventListener("click", deselectRoom);
    
    // Furniture catalog tab toggle
    const catalogTabs = document.querySelectorAll(".catalog-tab-btn");
    catalogTabs.forEach(tab => {
        tab.addEventListener("click", () => {
            catalogTabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");
            
            const target = tab.getAttribute("data-catalog");
            document.querySelectorAll(".catalog-list").forEach(list => list.classList.remove("active"));
            document.getElementById(`catalog${target.charAt(0).toUpperCase() + target.slice(1)}List`).classList.add("active");
        });
    });

    // Inspector adjustment inputs
    document.getElementById("inspectorItemWidth").addEventListener("input", handleInspectorItemResize);
    document.getElementById("inspectorItemHeight").addEventListener("input", handleInspectorItemResize);
    
    const rotationSlider = document.getElementById("inspectorItemRotation");
    rotationSlider.addEventListener("input", (e) => {
        document.getElementById("rotationValueText").textContent = `${e.target.value}°`;
        handleInspectorItemRotate(parseInt(e.target.value));
    });

    document.getElementById("rotate90Btn").addEventListener("click", () => {
        const rotationSlider = document.getElementById("inspectorItemRotation");
        let rot = (parseInt(rotationSlider.value) + 90) % 360;
        rotationSlider.value = rot;
        document.getElementById("rotationValueText").textContent = `${rot}°`;
        handleInspectorItemRotate(rot);
    });

    document.getElementById("deleteItemBtn").addEventListener("click", handleDeleteSelectedItem);

    // --- Tab Tasks Listeners ---
    document.getElementById("addTaskForm").addEventListener("submit", handleAddTask);
    
    // Filters for tasks
    const filterBtns = document.querySelectorAll(".filter-btn");
    filterBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            filterBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            renderTasksTable(btn.getAttribute("data-filter"));
        });
    });

    // --- Tab Moving Listeners ---
    document.getElementById("openAddBoxModalBtn").addEventListener("click", () => openModal("addBoxModal"));
    document.getElementById("createBoxForm").addEventListener("submit", handleCreateBox);
    document.getElementById("quickAddBoxBtn").addEventListener("click", handleQuickAddBox);

    // --- Tab Requests Listeners ---
    document.getElementById("addRequestForm").addEventListener("submit", handleCreateRequest);
    document.getElementById("sendWidgetRequestBtn").addEventListener("click", handleSendWidgetRequest);

    // --- Tab Settings Listeners ---
    document.getElementById("regenerateCodeBtn").addEventListener("click", handleRegenerateCode);
    document.getElementById("connectCodeBtn").addEventListener("click", handleConnectHousehold);
    document.getElementById("addFamilyMemberForm").addEventListener("submit", handleAddFamilyMember);
}

function switchTab(tabName) {
    // Update menu classes
    document.querySelectorAll(".sidebar-nav .nav-item").forEach(item => {
        item.classList.remove("active");
    });
    const activeNavItem = document.getElementById(`tab-${tabName}`);
    if (activeNavItem) activeNavItem.classList.add("active");

    // Update visibility of content sections
    document.querySelectorAll(".tab-content").forEach(section => {
        section.classList.remove("active");
    });
    const activeSection = document.getElementById(`content-${tabName}`);
    if (activeSection) activeSection.classList.add("active");

    // View specific updates
    if (tabName === "dashboard") {
        renderDashboardPlan();
    }
}

// --- Common UI Render Dispatcher ---
function renderAllViews() {
    renderDashboardStats();
    renderDashboardPlan();
    renderFloorPlanWorkspace();
    renderTasksTable();
    renderMovingBoxes();
    renderMaterialRequests();
    renderSettingsHousehold();
    renderNotifications();
    updateRoomSelectors();
    updateMemberSelectors();
}

function renderNotifications() {
    const list = document.getElementById("sidebarNotificationsList");
    if (!list) return;
    
    if (state.notifications.length === 0) {
        list.innerHTML = `<div class="empty-notif">No hay notificaciones recientes</div>`;
        return;
    }
    
    list.innerHTML = state.notifications.map(notif => `
        <div class="notif-item notif-${notif.type || 'info'}">
            <div>${notif.message}</div>
            <span class="notif-time">${notif.time}</span>
        </div>
    `).join("");
}

function updateSyncCodeDisplay() {
    document.getElementById("syncCodeText").textContent = `Código: ${state.syncCode}`;
    document.getElementById("welcomeSyncCode").textContent = state.syncCode;
    document.getElementById("settingsSyncCodeDisplay").textContent = state.syncCode;
}

// --- Form Population Helpers ---
function updateRoomSelectors() {
    const selectors = ["widgetRequestRoom", "taskRoom", "boxDestRoom", "requestRoom"];
    selectors.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        
        // Preserve selected value if possible
        const prevValue = select.value;
        
        select.innerHTML = "";
        
        if (id === "taskRoom" || id === "boxDestRoom" || id === "requestRoom") {
            const defaultOption = document.createElement("option");
            defaultOption.value = "";
            defaultOption.disabled = true;
            defaultOption.selected = !prevValue;
            defaultOption.textContent = "Selecciona una estancia...";
            select.appendChild(defaultOption);
        }

        state.rooms.forEach(room => {
            const opt = document.createElement("option");
            opt.value = room.id;
            opt.textContent = `${room.name} (${room.width}x${room.height}m)`;
            if (room.id === prevValue) opt.selected = true;
            select.appendChild(opt);
        });
    });
}

function updateMemberSelectors() {
    const selectors = ["widgetRequestMember", "taskAssignee", "requestMember"];
    selectors.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        
        const prevValue = select.value;
        select.innerHTML = "";
        
        state.members.forEach(member => {
            const opt = document.createElement("option");
            opt.value = member.id;
            opt.textContent = member.name;
            if (member.id === prevValue) opt.selected = true;
            select.appendChild(opt);
        });
    });
}

// --- 2D FLOOR PLANNER LOGIC ---

function handleAddRoom(e) {
    e.preventDefault();
    const name = document.getElementById("roomName").value.trim();
    const width = parseFloat(document.getElementById("roomWidth").value);
    const height = parseFloat(document.getElementById("roomHeight").value);
    const color = document.querySelector('input[name="roomColor"]:checked').value;
    
    if (!name || isNaN(width) || isNaN(height)) return;

    // Check canvas boundaries to avoid placing room outside viewable area
    const canvas = document.getElementById("canvasWorkspace");
    const maxPosX = Math.max(20, (canvas.clientWidth || 500) - (width * SCALE) - 40);
    const maxPosY = Math.max(20, (canvas.clientHeight || 400) - (height * SCALE) - 40);
    const randomX = Math.round((Math.random() * maxPosX + 20) / SNAP_GRID) * SNAP_GRID;
    const randomY = Math.round((Math.random() * maxPosY + 20) / SNAP_GRID) * SNAP_GRID;

    const newRoom = {
        id: "room-" + Date.now(),
        name,
        width,
        height,
        color,
        x: randomX,
        y: randomY
    };

    state.rooms.push(newRoom);
    saveStateToStorage();
    
    // Log
    addNotification(`Habitación "${name}" añadida (${width}x${height}m)`, "info");
    
    // Reset form
    document.getElementById("roomName").value = "";
    
    // Update and render
    updateRoomSelectors();
    renderFloorPlanWorkspace();
    renderDashboardPlan();
}

function renderFloorPlanWorkspace() {
    const workspace = document.getElementById("canvasWorkspace");
    if (!workspace) return;

    // Remove existing room elements (keep scale legends & helpers)
    document.querySelectorAll(".canvas-room").forEach(el => el.remove());

    state.rooms.forEach(room => {
        const roomEl = document.createElement("div");
        roomEl.id = room.id;
        roomEl.className = `canvas-room color-${room.color} ${state.selectedRoomId === room.id ? 'selected' : ''}`;
        
        // Size styled according to scale (1m = 40px)
        const widthPx = room.width * SCALE;
        const heightPx = room.height * SCALE;
        roomEl.style.width = `${widthPx}px`;
        roomEl.style.height = `${heightPx}px`;
        roomEl.style.left = `${room.x}px`;
        roomEl.style.top = `${room.y}px`;

        // Check if there are active warning cleaning tasks in this room assigned to the active user
        const hasAlert = state.tasks.some(t => t.roomId === room.id && t.assigneeId === state.currentMemberId && t.status === "pending" && t.priority === "alta");
        if (hasAlert) {
            roomEl.classList.add("alert-pulse");
        }

        // Room Inner HTML Header
        roomEl.innerHTML = `
            <div class="room-header">
                <span class="room-title">${room.name}</span>
                <span class="room-dimensions">${room.width}x${room.height}m</span>
                ${hasAlert ? '<i class="fa-solid fa-triangle-exclamation room-alert-icon"></i>' : ''}
            </div>
        `;

        // Load and render room specific furniture items
        const roomItems = state.items.filter(item => item.roomId === room.id);
        roomItems.forEach(item => {
            const itemEl = document.createElement("div");
            itemEl.id = item.id;
            itemEl.className = `canvas-item ${item.type === 'plant' ? 'item-plant' : ''} ${state.selectedItemId === item.id ? 'selected' : ''}`;
            
            const wPx = item.width * SCALE;
            const hPx = item.height * SCALE;
            itemEl.style.width = `${wPx}px`;
            itemEl.style.height = `${hPx}px`;
            itemEl.style.left = `${item.x}px`;
            itemEl.style.top = `${item.y}px`;
            itemEl.style.transform = `rotate(${item.rotation || 0}deg)`;

            itemEl.innerHTML = `
                <div>
                    <i class="fa-solid ${item.icon} canvas-item-icon"></i>
                    <span>${item.name}</span>
                </div>
            `;

            // Furniture click select listener
            itemEl.addEventListener("mousedown", (e) => {
                e.stopPropagation(); // Stop room selection
                selectItem(item.id);
                initItemDrag(e, item, itemEl, roomEl, room);
            });

            roomEl.appendChild(itemEl);
        });

        // Room Drag & Drop and Selection Listeners
        roomEl.addEventListener("mousedown", (e) => {
            if (e.target.classList.contains("canvas-item") || e.target.closest(".canvas-item")) return;
            selectRoom(room.id);
            initRoomDrag(e, room, roomEl);
        });

        workspace.appendChild(roomEl);
    });
}

// Room Drag Engine
function initRoomDrag(e, room, roomEl) {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startRoomX = room.x;
    const startRoomY = room.y;
    
    roomEl.style.cursor = "grabbing";

    function onMouseMove(moveEvent) {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        let newX = Math.round((startRoomX + deltaX) / SNAP_GRID) * SNAP_GRID;
        let newY = Math.round((startRoomY + deltaY) / SNAP_GRID) * SNAP_GRID;

        // Bound constraints
        const workspace = document.getElementById("canvasWorkspace");
        const maxW = (workspace.clientWidth || 800) - (room.width * SCALE) - 10;
        const maxH = (workspace.clientHeight || 500) - (room.height * SCALE) - 10;
        
        newX = Math.max(10, Math.min(newX, maxW));
        newY = Math.max(10, Math.min(newY, maxH));

        room.x = newX;
        room.y = newY;

        roomEl.style.left = `${newX}px`;
        roomEl.style.top = `${newY}px`;
    }

    function onMouseUp() {
        roomEl.style.cursor = "grab";
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        saveStateToStorage();
        renderDashboardPlan();
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
}

// Furniture Inside Room Drag Engine
function initItemDrag(e, item, itemEl, roomEl, room) {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startItemX = item.x;
    const startItemY = item.y;

    function onMouseMove(moveEvent) {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        // Snape item coordinates to small increments
        let newX = Math.round((startItemX + deltaX) / 5) * 5;
        let newY = Math.round((startItemY + deltaY) / 5) * 5;

        // Bound constraints within the parent room boundaries
        const roomW = room.width * SCALE;
        const roomH = room.height * SCALE;
        const itemW = item.width * SCALE;
        const itemH = item.height * SCALE;

        newX = Math.max(0, Math.min(newX, roomW - itemW));
        newY = Math.max(0, Math.min(newY, roomH - itemH));

        item.x = newX;
        item.y = newY;

        itemEl.style.left = `${newX}px`;
        itemEl.style.top = `${newY}px`;
    }

    function onMouseUp() {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        saveStateToStorage();
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
}

function selectRoom(roomId) {
    state.selectedRoomId = roomId;
    state.selectedItemId = null; // Clear item selection
    
    // Highlight room element in workspace
    document.querySelectorAll(".canvas-room").forEach(el => {
        el.classList.toggle("selected", el.id === roomId);
    });
    
    // Hide item inspector, show furniture catalog
    document.getElementById("itemInspectorSection").style.display = "none";
    
    const catalogSec = document.getElementById("furnitureCatalogSection");
    catalogSec.style.display = "block";
    
    const room = state.rooms.find(r => r.id === roomId);
    document.getElementById("selectedRoomName").textContent = room.name;

    // Load Catalog Items
    populateCatalog();
}

function deselectRoom() {
    state.selectedRoomId = null;
    state.selectedItemId = null;
    document.querySelectorAll(".canvas-room").forEach(el => el.classList.remove("selected"));
    document.getElementById("furnitureCatalogSection").style.display = "none";
    document.getElementById("itemInspectorSection").style.display = "none";
}

function selectItem(itemId) {
    state.selectedItemId = itemId;
    
    // Highlight item element
    document.querySelectorAll(".canvas-item").forEach(el => {
        el.classList.toggle("selected", el.id === itemId);
    });
    
    const item = state.items.find(i => i.id === itemId);
    if (!item) return;

    // Hide furniture catalog, show item inspector
    document.getElementById("furnitureCatalogSection").style.display = "none";
    
    const inspector = document.getElementById("itemInspectorSection");
    inspector.style.display = "block";
    
    document.getElementById("inspectorItemTitle").textContent = item.name;
    document.getElementById("inspectorItemWidth").value = item.width;
    document.getElementById("inspectorItemHeight").value = item.height;
    
    const rotationSlider = document.getElementById("inspectorItemRotation");
    rotationSlider.value = item.rotation || 0;
    document.getElementById("rotationValueText").textContent = `${item.rotation || 0}°`;
}

function populateCatalog() {
    const furnitureList = document.getElementById("catalogFurnitureList");
    const plantsList = document.getElementById("catalogPlantsList");

    furnitureList.innerHTML = CATALOG_ITEMS.furniture.map(cItem => `
        <div class="catalog-item" onclick="addCatalogItemToSelectedRoom('${cItem.name}', ${cItem.width}, ${cItem.height}, '${cItem.icon}', 'furniture')">
            <i class="fa-solid ${cItem.icon}"></i>
            <span>${cItem.name}</span>
        </div>
    `).join("");

    plantsList.innerHTML = CATALOG_ITEMS.plants.map(cItem => `
        <div class="catalog-item" onclick="addCatalogItemToSelectedRoom('${cItem.name}', ${cItem.width}, ${cItem.height}, '${cItem.icon}', 'plant')">
            <i class="fa-solid ${cItem.icon}"></i>
            <span>${cItem.name}</span>
        </div>
    `).join("");
}

function addCatalogItemToSelectedRoom(name, width, height, icon, type) {
    if (!state.selectedRoomId) return;
    
    const room = state.rooms.find(r => r.id === state.selectedRoomId);
    if (!room) return;

    // Check space limits
    const roomW = room.width * SCALE;
    const roomH = room.height * SCALE;
    const itemW = width * SCALE;
    const itemH = height * SCALE;
    
    // Position at random center offset of room
    const posX = Math.max(0, Math.round(((roomW - itemW) / 2) / 5) * 5);
    const posY = Math.max(0, Math.round(((roomH - itemH) / 2) / 5) * 5);

    const newItem = {
        id: "item-" + Date.now(),
        roomId: state.selectedRoomId,
        name,
        width,
        height,
        icon,
        type,
        x: posX,
        y: posY,
        rotation: 0
    };

    state.items.push(newItem);
    saveStateToStorage();
    
    addNotification(`Añadido/a "${name}" a ${room.name}`, "success");
    renderFloorPlanWorkspace();
    
    // Auto-select the newly added item
    selectItem(newItem.id);
}

function handleInspectorItemResize() {
    if (!state.selectedItemId) return;
    const item = state.items.find(i => i.id === state.selectedItemId);
    if (!item) return;

    const newW = parseFloat(document.getElementById("inspectorItemWidth").value);
    const newH = parseFloat(document.getElementById("inspectorItemHeight").value);

    if (isNaN(newW) || isNaN(newH) || newW < 0.1 || newH < 0.1) return;

    item.width = newW;
    item.height = newH;
    saveStateToStorage();
    renderFloorPlanWorkspace();
}

function handleInspectorItemRotate(rotation) {
    if (!state.selectedItemId) return;
    const item = state.items.find(i => i.id === state.selectedItemId);
    if (!item) return;

    item.rotation = rotation;
    saveStateToStorage();
    
    const itemEl = document.getElementById(item.id);
    if (itemEl) {
        itemEl.style.transform = `rotate(${rotation}deg)`;
    }
}

function handleDeleteSelectedItem() {
    if (!state.selectedItemId) return;
    const itemIdx = state.items.findIndex(i => i.id === state.selectedItemId);
    if (itemIdx === -1) return;

    const itemName = state.items[itemIdx].name;
    state.items.splice(itemIdx, 1);
    state.selectedItemId = null;
    
    saveStateToStorage();
    addNotification(`Eliminado "${itemName}" del plano`, "info");
    
    document.getElementById("itemInspectorSection").style.display = "none";
    renderFloorPlanWorkspace();
}

function clearFloorPlan() {
    if (confirm("¿Estás seguro de que deseas borrar por completo el plano de tu casa y todos sus muebles?")) {
        state.rooms = [];
        state.items = [];
        state.tasks = [];
        state.boxes = [];
        saveStateToStorage();
        deselectRoom();
        renderAllViews();
        addNotification("Se ha borrado el plano completo de la vivienda", "warning");
    }
}

// --- DASHBOARD FLOOR PLAN PREVIEW ---
function renderDashboardPlan() {
    const container = document.getElementById("dashboardPlanPreview");
    if (!container) return;

    if (state.rooms.length === 0) {
        container.innerHTML = `
            <div class="no-plan-prompt">
                <i class="fa-solid fa-pencil"></i>
                <p>No has diseñado ninguna habitación aún.</p>
                <button class="btn btn-primary" onclick="switchTab('planner')">Empezar a Diseñar</button>
            </div>
        `;
        return;
    }

    container.innerHTML = "";
    
    // Scale layout to fit in a 350x220 container
    // Find layout bounding boxes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    state.rooms.forEach(r => {
        if (r.x < minX) minX = r.x;
        if (r.y < minY) minY = r.y;
        const rMaxX = r.x + r.width * SCALE;
        const rMaxY = r.y + r.height * SCALE;
        if (rMaxX > maxX) maxX = rMaxX;
        if (rMaxY > maxY) maxY = rMaxY;
    });

    const houseW = (maxX - minX) || 100;
    const houseH = (maxY - minY) || 100;
    
    const scaleX = (container.clientWidth - 40) / houseW;
    const scaleY = (container.clientHeight - 40) / houseH;
    const fitScale = Math.min(scaleX, scaleY, 1); // Max scaling is 1:1 original scale

    const previewWrapper = document.createElement("div");
    previewWrapper.style.position = "relative";
    previewWrapper.style.width = `${houseW * fitScale}px`;
    previewWrapper.style.height = `${houseH * fitScale}px`;

    state.rooms.forEach(room => {
        const miniRoom = document.createElement("div");
        miniRoom.className = `canvas-room color-${room.color}`;
        
        // Apply scaled positions
        miniRoom.style.width = `${(room.width * SCALE) * fitScale}px`;
        miniRoom.style.height = `${(room.height * SCALE) * fitScale}px`;
        miniRoom.style.left = `${(room.x - minX) * fitScale}px`;
        miniRoom.style.top = `${(room.y - minY) * fitScale}px`;
        miniRoom.style.position = "absolute";
        miniRoom.style.padding = "4px";
        miniRoom.style.borderRadius = "6px";
        miniRoom.style.cursor = "pointer";
        miniRoom.onclick = () => switchTab('planner');

        const hasAlert = state.tasks.some(t => t.roomId === room.id && t.assigneeId === state.currentMemberId && t.status === "pending" && t.priority === "alta");
        if (hasAlert) {
            miniRoom.classList.add("alert-pulse");
        }

        miniRoom.innerHTML = `
            <div style="font-size: 0.65rem; font-weight: 700; color: white; display: flex; align-items:center; justify-content:space-between;">
                <span>${room.name}</span>
                ${hasAlert ? '<i class="fa-solid fa-triangle-exclamation room-alert-icon" style="font-size:0.6rem;"></i>' : ''}
            </div>
        `;
        previewWrapper.appendChild(miniRoom);
    });

    container.appendChild(previewWrapper);
}

// --- TASK MANAGEMENT SYSTEM LOGIC ---

function handleAddTask(e) {
    e.preventDefault();
    const title = document.getElementById("taskTitle").value.trim();
    const roomId = document.getElementById("taskRoom").value;
    const assigneeId = document.getElementById("taskAssignee").value;
    const priority = document.getElementById("taskPriority").value;
    
    if (!title || !roomId || !assigneeId) return;

    const newTask = {
        id: "task-" + Date.now(),
        title,
        roomId,
        assigneeId,
        priority,
        status: "pending",
        senderId: state.currentMemberId
    };

    state.tasks.push(newTask);
    saveStateToStorage();

    // Notify assignee
    const assignee = state.members.find(m => m.id === assigneeId);
    const room = state.rooms.find(r => r.id === roomId);
    const sender = state.members.find(m => m.id === state.currentMemberId);
    
    addNotification(`Tarea "${title}" asignada a ${assignee.name} en ${room.name}`, "info");

    // Reset Form
    document.getElementById("taskTitle").value = "";
    document.getElementById("taskRoom").selectedIndex = 0;

    renderAllViews();
    
    // Simulate real-time modal trigger if sending to active user
    if (assigneeId === state.currentMemberId) {
        showTaskAlertModal(newTask);
    }
}

function renderTasksTable(filter = "all") {
    const tbody = document.getElementById("tasksTableBody");
    const emptyState = document.getElementById("tasksEmptyState");
    if (!tbody) return;

    tbody.innerHTML = "";

    const filteredTasks = state.tasks.filter(task => {
        if (filter === "pending") return task.status === "pending";
        if (filter === "completed") return task.status === "completed";
        return true;
    });

    if (filteredTasks.length === 0) {
        emptyState.style.display = "block";
        return;
    } else {
        emptyState.style.display = "none";
    }

    filteredTasks.forEach(task => {
        const tr = document.createElement("tr");
        if (task.status === "completed") {
            tr.className = "task-row-completed";
        }

        const room = state.rooms.find(r => r.id === task.roomId) || { name: "Casa" };
        const assignee = state.members.find(m => m.id === task.assigneeId) || { name: "Nadie" };
        
        tr.innerHTML = `
            <td class="task-status-cell">
                <i class="${task.status === 'completed' ? 'fa-solid fa-circle-check text-success' : 'fa-regular fa-circle'} task-checkbox" onclick="toggleTaskStatus('${task.id}')"></i>
            </td>
            <td class="task-title-cell">${task.title}</td>
            <td><span class="meta-room"><i class="fa-solid fa-door-open"></i> ${room.name}</span></td>
            <td><strong>${assignee.name}</strong></td>
            <td><span class="priority-tag ${task.priority}">${task.priority}</span></td>
            <td>
                <button class="btn-remove-member" onclick="deleteTask('${task.id}')"><i class="fa-solid fa-trash-can"></i></button>
            </td>
        `;

        tbody.appendChild(tr);
    });

    // Populate dashboard urgent widgets
    renderDashboardUrgentTasks();
}

function toggleTaskStatus(taskId) {
    const task = state.tasks.find(t => t.id === taskId);
    if (!task) return;

    const prevStatus = task.status;
    task.status = prevStatus === "pending" ? "completed" : "pending";
    saveStateToStorage();
    
    const room = state.rooms.find(r => r.id === task.roomId) || { name: "Estancia" };
    const assignee = state.members.find(m => m.id === task.assigneeId) || { name: "Usuario" };

    if (task.status === "completed") {
        playAudioNotification('chime');
        addNotification(`Tarea finalizada: "${task.title}" completada por ${assignee.name} en ${room.name}`, "success");
    } else {
        addNotification(`Tarea marcada como pendiente: "${task.title}"`, "info");
    }

    renderAllViews();
}

function deleteTask(taskId) {
    const idx = state.tasks.findIndex(t => t.id === taskId);
    if (idx === -1) return;
    
    const task = state.tasks[idx];
    state.tasks.splice(idx, 1);
    saveStateToStorage();
    
    addNotification(`Tarea "${task.title}" eliminada`, "info");
    renderAllViews();
}

// Modal Alert for assigned user
function showTaskAlertModal(task) {
    const modal = document.getElementById("taskAlertModal");
    const sender = state.members.find(m => m.id === task.senderId) || { name: "Miembro del hogar" };
    const room = state.rooms.find(r => r.id === task.roomId) || { name: "Vivienda" };

    playAudioNotification('alert');

    document.getElementById("alertModalTaskName").textContent = task.title;
    document.getElementById("alertModalTaskRoom").textContent = room.name;
    document.getElementById("alertModalSender").textContent = sender.name;
    
    const completeBtn = document.getElementById("alertModalCompleteBtn");
    completeBtn.onclick = () => {
        toggleTaskStatus(task.id);
        closeModal('taskAlertModal');
    };

    openModal('taskAlertModal');
}

function renderDashboardUrgentTasks() {
    const list = document.getElementById("dashboardUrgentTasksList");
    if (!list) return;

    // Filter pending tasks assigned to current active user
    const userTasks = state.tasks.filter(t => t.assigneeId === state.currentMemberId && t.status === "pending");
    
    if (userTasks.length === 0) {
        list.innerHTML = `<div class="empty-list">¡Sin tareas pendientes! Todo limpio. ✨</div>`;
        return;
    }

    // Sort by priority (alta first)
    userTasks.sort((a,b) => {
        const scores = { alta: 3, media: 2, baja: 1 };
        return scores[b.priority] - scores[a.priority];
    });

    list.innerHTML = userTasks.slice(0, 3).map(task => {
        const room = state.rooms.find(r => r.id === task.roomId) || { name: "Casa" };
        const priorityIcon = task.priority === "alta" ? '<i class="fa-solid fa-triangle-exclamation text-danger" style="margin-left:4px;"></i>' : '';
        return `
            <div class="urgent-task-item">
                <div class="task-info-main">
                    <span class="task-info-title">${task.title} ${priorityIcon}</span>
                    <div class="task-info-meta">
                        <span class="meta-room"><i class="fa-solid fa-door-open"></i> ${room.name}</span>
                        <span class="priority-tag ${task.priority}" style="font-size:0.6rem; padding: 1px 6px;">${task.priority}</span>
                    </div>
                </div>
                <button class="task-btn-complete" onclick="toggleTaskStatus('${task.id}')" title="Marcar como Completada">
                    <i class="fa-solid fa-check"></i>
                </button>
            </div>
        `;
    }).join("");
}

// --- MOVING PLANNER SYSTEM LOGIC ---

function handleCreateBox(e) {
    e.preventDefault();
    const name = document.getElementById("boxName").value.trim();
    const contents = document.getElementById("boxContents").value.trim();
    const destRoomId = document.getElementById("boxDestRoom").value;
    const status = document.getElementById("boxStatus").value;
    const color = document.querySelector('input[name="boxColor"]:checked').value;

    if (!name || !destRoomId) return;

    const newBox = {
        id: "box-" + Date.now(),
        name,
        contents,
        destRoomId,
        status,
        color
    };

    state.boxes.push(newBox);
    saveStateToStorage();

    const room = state.rooms.find(r => r.id === destRoomId);
    addNotification(`Caja "${name}" creada con destino a ${room ? room.name : "Habitación"}`, "success");

    // Clear and close
    document.getElementById("createBoxForm").reset();
    closeModal("addBoxModal");
    renderAllViews();
}

function handleQuickAddBox() {
    const name = document.getElementById("quickBoxName").value.trim();
    if (!name || state.rooms.length === 0) {
        if (state.rooms.length === 0) showToast("Añade al menos una habitación primero", "warning");
        return;
    }

    const newBox = {
        id: "box-" + Date.now(),
        name,
        contents: "Detalle rápido sin definir",
        destRoomId: state.rooms[0].id,
        status: "packed",
        color: "#3b82f6"
    };

    state.boxes.push(newBox);
    saveStateToStorage();
    addNotification(`Caja rápida "${name}" añadida a la mudanza`, "info");
    document.getElementById("quickBoxName").value = "";
    renderAllViews();
}

function renderMovingBoxes() {
    const grid = document.getElementById("movingBoxesGrid");
    if (!grid) return;

    grid.innerHTML = "";

    if (state.boxes.length === 0) {
        grid.innerHTML = `
            <div class="empty-state-box" style="grid-column: 1/-1;">
                <i class="fa-solid fa-boxes-packing"></i>
                <p>Aún no has añadido ninguna caja a la mudanza. Haz clic en "Crear Nueva Caja".</p>
            </div>
        `;
        return;
    }

    state.boxes.forEach(box => {
        const card = document.createElement("div");
        card.className = "box-card";
        card.style.borderTopColor = box.color;

        const room = state.rooms.find(r => r.id === box.destRoomId) || { name: "Sin dest." };

        card.innerHTML = `
            <div class="box-card-header">
                <span class="box-number">${box.name}</span>
                <span class="box-dest-badge"><i class="fa-solid fa-door-open"></i> ${room.name}</span>
            </div>
            <div class="box-contents-text">${box.contents || '<i>Caja vacía / Sin detalles</i>'}</div>
            <div class="box-card-actions">
                <span class="box-status-toggle ${box.status}" onclick="toggleBoxStatus('${box.id}')">
                    <i class="fa-solid ${box.status === 'unpacked' ? 'fa-box-open' : 'fa-box'}"></i>
                    ${box.status === 'unpacked' ? 'Desembalada' : 'Embalada'}
                </span>
                <button class="btn-delete-box" onclick="deleteBox('${box.id}')" title="Eliminar caja">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        `;

        grid.appendChild(card);
    });

    updateMovingProgress();
}

function toggleBoxStatus(boxId) {
    const box = state.boxes.find(b => b.id === boxId);
    if (!box) return;

    box.status = box.status === "packed" ? "unpacked" : "packed";
    saveStateToStorage();
    
    if (box.status === "unpacked") {
        playAudioNotification('chime');
        addNotification(`Caja desembalada: "${box.name}" colocada en destino`, "success");
    } else {
        addNotification(`Caja re-embalada: "${box.name}"`, "info");
    }
    
    renderAllViews();
}

function deleteBox(boxId) {
    const idx = state.boxes.findIndex(b => b.id === boxId);
    if (idx === -1) return;

    const box = state.boxes[idx];
    state.boxes.splice(idx, 1);
    saveStateToStorage();
    
    addNotification(`Caja "${box.name}" eliminada`, "info");
    renderAllViews();
}

function updateMovingProgress() {
    const total = state.boxes.length;
    const unpacked = state.boxes.filter(b => b.status === "unpacked").length;
    const packed = total - unpacked;
    const percent = total > 0 ? Math.round((unpacked / total) * 100) : 0;

    // Moving Tab stats
    document.getElementById("movingTotalBoxes").textContent = total;
    document.getElementById("movingPackedBoxes").textContent = packed;
    document.getElementById("movingUnpackedBoxes").textContent = unpacked;
    document.getElementById("movingProgressPercent").textContent = `${percent}%`;
    document.getElementById("movingMainProgressBar").style.width = `${percent}%`;

    // Widget stats (Dashboard)
    document.getElementById("movingWidgetTotal").textContent = total;
    document.getElementById("movingWidgetPacked").textContent = packed;
    document.getElementById("movingWidgetUnpacked").textContent = unpacked;
    document.getElementById("movingWidgetProgressBar").style.style = `width: ${percent}%;`; // Wait, widget bar fill
    document.getElementById("movingWidgetProgressBar").style.width = `${percent}%`;
    document.getElementById("statMovingProgress").textContent = `${percent}%`;
}

// --- MATERIAL REQUESTER SYSTEM LOGIC ---

function handleCreateRequest(e) {
    e.preventDefault();
    const material = document.getElementById("requestMaterial").value.trim();
    const senderRoomId = document.getElementById("requestRoom").value;
    const receiverId = document.getElementById("requestMember").value;

    if (!material || !senderRoomId || !receiverId) return;

    const newRequest = {
        id: "req-" + Date.now(),
        material,
        senderId: state.currentMemberId,
        senderRoomId,
        receiverId,
        status: "pendiente"
    };

    state.requests.push(newRequest);
    saveStateToStorage();

    const sender = state.members.find(m => m.id === state.currentMemberId);
    const receiver = state.members.find(m => m.id === receiverId);
    const room = state.rooms.find(r => r.id === senderRoomId);

    addNotification(`Petición enviada: ${sender.name} solicita "${material}" a ${receiver.name} desde ${room.name}`, "info");

    document.getElementById("requestMaterial").value = "";
    document.getElementById("requestRoom").selectedIndex = 0;
    
    renderAllViews();
    
    // If receiver is active simulation, show alerts
    if (receiverId === state.currentMemberId) {
        checkActiveAlertsForUser(receiverId);
    }
}

function handleSendWidgetRequest() {
    const material = document.getElementById("widgetRequestMaterial").value.trim();
    const senderRoomId = document.getElementById("widgetRequestRoom").value;
    const receiverId = document.getElementById("widgetRequestMember").value;

    if (!material) {
        showToast("Escribe qué material necesitas", "warning");
        return;
    }
    
    if (state.rooms.length === 0) {
        showToast("Crea al menos una habitación en el diseñador primero", "warning");
        return;
    }

    const newRequest = {
        id: "req-" + Date.now(),
        material,
        senderId: state.currentMemberId,
        senderRoomId: senderRoomId || state.rooms[0].id,
        receiverId,
        status: "pendiente"
    };

    state.requests.push(newRequest);
    saveStateToStorage();

    const sender = state.members.find(m => m.id === state.currentMemberId);
    const receiver = state.members.find(m => m.id === receiverId);
    
    addNotification(`Petición rápida: ${sender.name} solicita "${material}" a ${receiver.name}`, "info");
    document.getElementById("widgetRequestMaterial").value = "";
    renderAllViews();

    if (receiverId === state.currentMemberId) {
        checkActiveAlertsForUser(receiverId);
    }
}

function renderMaterialRequests() {
    const feed = document.getElementById("requestsFeedList");
    if (!feed) return;

    feed.innerHTML = "";

    // Count pending requests directed to the active user
    const pendingToActiveUser = state.requests.filter(r => r.receiverId === state.currentMemberId && r.status === "pendiente").length;
    const badge = document.getElementById("requestsCountBadge");
    if (badge) {
        if (pendingToActiveUser > 0) {
            badge.textContent = pendingToActiveUser;
            badge.style.display = "block";
        } else {
            badge.style.display = "none";
        }
    }

    if (state.requests.length === 0) {
        feed.innerHTML = `
            <div class="empty-state-box">
                <i class="fa-solid fa-satellite-dish"></i>
                <p>No hay solicitudes activas en este momento.</p>
            </div>
        `;
        return;
    }

    // Sort requests by active status (pendiente first)
    const sortedReqs = [...state.requests].sort((a,b) => {
        const order = { pendiente: 1, aceptado: 2, recibido: 3 };
        return order[a.status] - order[b.status];
    });

    sortedReqs.forEach(req => {
        const card = document.createElement("div");
        card.className = "request-card";
        if (req.status === "pendiente") card.classList.add("urgent-border");

        const sender = state.members.find(m => m.id === req.senderId) || { name: "Usuario", avatar: "user" };
        const receiver = state.members.find(m => m.id === req.receiverId) || { name: "Usuario" };
        const room = state.rooms.find(r => r.id === req.senderRoomId) || { name: "Estancia" };

        let actionsHtml = "";
        
        // Context-aware actions depending on WHO is logged in (simulated device)
        if (req.status === "pendiente") {
            if (state.currentMemberId === req.receiverId) {
                // The receiver can accept
                actionsHtml = `
                    <div class="req-actions-col">
                        <button class="btn btn-sm btn-success" onclick="updateRequestStatus('${req.id}', 'aceptado')">
                            <i class="fa-solid fa-truck-moving"></i> Aceptar y Llevar
                        </button>
                        <button class="btn btn-sm btn-outline btn-danger" onclick="deleteRequest('${req.id}')" title="Rechazar">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                `;
            } else {
                actionsHtml = `<span style="font-size:0.8rem; color:var(--text-muted);">Esperando aceptación...</span>`;
            }
        } else if (req.status === "aceptado") {
            if (state.currentMemberId === req.senderId) {
                // The sender confirms delivery
                actionsHtml = `
                    <div class="req-actions-col">
                        <button class="btn btn-sm btn-success" onclick="updateRequestStatus('${req.id}', 'recibido')">
                            <i class="fa-solid fa-circle-check"></i> Marcar Recibido
                        </button>
                    </div>
                `;
            } else {
                actionsHtml = `<span style="font-size:0.8rem; color:var(--success); font-weight:600;"><i class="fa-solid fa-person-walking"></i> En camino...</span>`;
            }
        } else if (req.status === "recibido") {
            actionsHtml = `
                <button class="btn-remove-member" onclick="deleteRequest('${req.id}')" title="Limpiar del historial">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            `;
        }

        card.innerHTML = `
            <div class="req-avatar-col">
                <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=${sender.avatar}" alt="${sender.name}">
            </div>
            <div class="req-info-col">
                <div class="req-msg-bubble"><strong>${sender.name}</strong> solicita <span>"${req.material}"</span></div>
                <div class="req-meta">
                    <span>Ubicación: <strong>${room.name}</strong></span> &bull; 
                    <span>Asignado a: <strong>${receiver.name}</strong></span>
                </div>
            </div>
            <div class="req-actions-col">
                <span class="req-status-tag ${req.status}">${req.status}</span>
                ${actionsHtml}
            </div>
        `;

        feed.appendChild(card);
    });

    // Populate dashboard request widget status
    updateDashboardRequestWidget();
}

function updateRequestStatus(reqId, status) {
    const req = state.requests.find(r => r.id === reqId);
    if (!req) return;

    req.status = status;
    saveStateToStorage();

    const sender = state.members.find(m => m.id === req.senderId);
    const receiver = state.members.find(m => m.id === req.receiverId);

    if (status === "aceptado") {
        playAudioNotification('chime');
        addNotification(`Petición Aceptada: ${receiver.name} lleva "${req.material}" a ${sender.name}`, "info");
    } else if (status === "recibido") {
        playAudioNotification('chime');
        addNotification(`Petición Recibida: ${sender.name} confirmó haber recibido "${req.material}" de ${receiver.name}`, "success");
    }

    renderAllViews();
}

function deleteRequest(reqId) {
    const idx = state.requests.findIndex(r => r.id === reqId);
    if (idx === -1) return;

    state.requests.splice(idx, 1);
    saveStateToStorage();
    renderAllViews();
}

function updateDashboardRequestWidget() {
    const statusBox = document.getElementById("dashboardActiveRequestStatus");
    if (!statusBox) return;

    // Find the latest pending/accepted request where current user is sender or receiver
    const activeReq = state.requests.find(r => 
        (r.senderId === state.currentMemberId || r.receiverId === state.currentMemberId) && 
        (r.status === "pendiente" || r.status === "aceptado")
    );

    if (!activeReq) {
        statusBox.style.display = "none";
        return;
    }

    statusBox.style.display = "flex";
    const sender = state.members.find(m => m.id === activeReq.senderId);
    const receiver = state.members.find(m => m.id === activeReq.receiverId);
    
    let text = "";
    if (activeReq.senderId === state.currentMemberId) {
        text = `Pides <strong>"${activeReq.material}"</strong> a ${receiver.name.split(" ")[0]} (${activeReq.status})`;
    } else {
        text = `${sender.name.split(" ")[0]} te pide <strong>"${activeReq.material}"</strong>`;
    }

    statusBox.innerHTML = `
        <div class="active-req-info">${text}</div>
        <button class="btn btn-sm btn-primary" onclick="switchTab('requests')">Ver</button>
    `;
}

// --- SETTINGS, CODE LINKING & HOUSEHOLD SYNC LOGIC ---

function handleRegenerateCode() {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const newCode = `HOME-${randomNum}`;
    
    if (confirm(`¿Quieres crear una nueva unidad de Hogar? Generará el código ${newCode} y cambiará tu espacio de trabajo.`)) {
        state.syncCode = newCode;
        localStorage.setItem("homely_sync_code", newCode);
        
        // Reload settings
        initApp();
        addNotification(`Creado nuevo hogar con código ${newCode}`, "success");
    }
}

function handleConnectHousehold() {
    const inputCode = document.getElementById("connectSyncCodeInput").value.trim().toUpperCase();
    const statusText = document.getElementById("connectStatusMsg");

    if (!inputCode) {
        statusText.className = "status-msg error";
        statusText.textContent = "Introduce un código válido.";
        return;
    }

    if (!/^HOME-\d{4}$/.test(inputCode)) {
        statusText.className = "status-msg error";
        statusText.textContent = "Formato inválido. Debe ser HOME-XXXX (ej. HOME-1234)";
        return;
    }

    // Switch active workspace
    state.syncCode = inputCode;
    localStorage.setItem("homely_sync_code", inputCode);
    
    // Clear connection input
    document.getElementById("connectSyncCodeInput").value = "";
    
    initApp();
    
    statusText.className = "status-msg success";
    statusText.textContent = "¡Conectado con éxito!";
    addNotification(`Te has vinculado al hogar con código ${inputCode}`, "success");
    
    setTimeout(() => {
        statusText.textContent = "";
    }, 3000);
}

function renderSettingsHousehold() {
    const list = document.getElementById("settingsMembersList");
    if (!list) return;

    list.innerHTML = state.members.map(member => {
        const isCurrent = member.id === state.currentMemberId ? ' <span class="member-role-badge">Activo</span>' : '';
        const canDelete = member.id !== state.members[0].id ? `
            <button class="btn-remove-member" onclick="deleteFamilyMember('${member.id}')" title="Eliminar miembro">
                <i class="fa-solid fa-user-minus"></i>
            </button>
        ` : '';
        
        return `
            <div class="family-member-item">
                <div class="member-identity">
                    <img src="https://api.dicebear.com/7.x/adventurer/svg?seed=${member.avatar}" alt="Avatar" class="member-avatar">
                    <div>
                        <span class="member-name">${member.name}</span>
                        ${isCurrent}
                    </div>
                </div>
                ${canDelete}
            </div>
        `;
    }).join("");
}

function handleAddFamilyMember(e) {
    e.preventDefault();
    const name = document.getElementById("newMemberName").value.trim();
    if (!name) return;

    const avatarSeed = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    
    const newMember = {
        id: "mem-" + Date.now(),
        name,
        avatar: avatarSeed || "user",
        role: "Miembro"
    };

    state.members.push(newMember);
    saveStateToStorage();
    addNotification(`Nuevo miembro de familia añadido: "${name}"`, "success");

    document.getElementById("newMemberName").value = "";
    renderAllViews();
    populateProfileSelector();
}

function deleteFamilyMember(memberId) {
    if (memberId === state.currentMemberId) {
        showToast("No puedes eliminar al miembro con el que estás simulando sesión actualmente.", "danger");
        return;
    }

    const idx = state.members.findIndex(m => m.id === memberId);
    if (idx === -1) return;

    const member = state.members[idx];
    if (confirm(`¿Estás seguro de que deseas eliminar a ${member.name} de este hogar? Se cancelarán sus tareas asignadas.`)) {
        // Remove member
        state.members.splice(idx, 1);
        
        // Remove tasks assigned to them
        state.tasks = state.tasks.filter(t => t.assigneeId !== memberId);
        
        saveStateToStorage();
        addNotification(`Eliminado miembro "${member.name}" y canceladas sus tareas.`, "warning");
        
        renderAllViews();
        populateProfileSelector();
    }
}

// --- DASHBOARD GENERAL STATS ---
function renderDashboardStats() {
    const pendingTasks = state.tasks.filter(t => t.status === "pending").length;
    document.getElementById("statPendingTasks").textContent = pendingTasks;
}

// --- DEMO DATA LOAD ---
function loadDemoData() {
    if (confirm("¿Deseas cargar una casa de demostración predefinida? Esto sobreescribirá tus datos actuales para este código de hogar.")) {
        // Predefined Rooms
        state.rooms = [
            { id: "demo-room-1", name: "Cocina", width: 5.0, height: 4.0, color: "teal", x: 40, y: 40 },
            { id: "demo-room-2", name: "Salón Principal", width: 6.0, height: 5.0, color: "blue", x: 260, y: 40 },
            { id: "demo-room-3", name: "Dormitorio Principal", width: 4.0, height: 4.0, color: "purple", x: 40, y: 220 },
            { id: "demo-room-4", name: "Baño Completo", width: 3.0, height: 3.0, color: "green", x: 220, y: 260 }
        ];

        // Predefined Items placed in rooms (scale offset)
        state.items = [
            // Kitchen Counter and Ficus in Kitchen (demo-room-1)
            { id: "demo-item-1", roomId: "demo-room-1", name: "Encimera Cocina", width: 2.0, height: 0.7, icon: "fa-sink", type: "furniture", x: 20, y: 10, rotation: 0 },
            { id: "demo-item-2", roomId: "demo-room-1", name: "Helecho Colgante", width: 0.8, height: 0.8, icon: "fa-leaf", type: "plant", x: 150, y: 110, rotation: 0 },
            
            // Sofa and dining table in Salon (demo-room-2)
            { id: "demo-item-3", roomId: "demo-room-2", name: "Sofá Confort", width: 2.2, height: 1.0, icon: "fa-couch", type: "furniture", x: 10, y: 15, rotation: 0 },
            { id: "demo-item-4", roomId: "demo-room-2", name: "Mesa Comedor", width: 1.8, height: 1.0, icon: "fa-table", type: "furniture", x: 40, y: 100, rotation: 90 },
            
            // Bed and Wardrobe in Bedroom (demo-room-3)
            { id: "demo-item-5", roomId: "demo-room-3", name: "Cama Doble", width: 2.0, height: 2.0, icon: "fa-bed", type: "furniture", x: 20, y: 20, rotation: 0 },
            
            // Plant in Bathroom (demo-room-4)
            { id: "demo-item-6", roomId: "demo-room-4", name: "Cactus Maceta", width: 0.5, height: 0.5, icon: "fa-leaf", type: "plant", x: 90, y: 90, rotation: 0 }
        ];

        // Demo Tasks
        state.tasks = [
            { id: "demo-task-1", title: "Fregar cacharros y encimera", roomId: "demo-room-1", assigneeId: "mem-2", priority: "media", status: "pending", senderId: "mem-1" },
            { id: "demo-task-2", title: "Ordenar sofás y limpiar polvo", roomId: "demo-room-2", assigneeId: "mem-3", priority: "baja", status: "completed", senderId: "mem-1" },
            { id: "demo-task-3", title: "HACER LA CAMA DE INMEDIATO", roomId: "demo-room-3", assigneeId: "mem-2", priority: "alta", status: "pending", senderId: "mem-1" }
        ];

        // Demo Moving boxes
        state.boxes = [
            { id: "demo-box-1", name: "Caja 1 - Vajilla y Vasos", contents: "Copas, platos hondos, platos llanos y cubiertos envueltos en papel burbuja.", destRoomId: "demo-room-1", status: "packed", color: "#ef4444" },
            { id: "demo-box-2", name: "Caja 2 - Mantas y Sábanas", contents: "Ropa de cama de invierno, edredón, almohadones del salón.", destRoomId: "demo-room-3", status: "unpacked", color: "#8b5cf6" },
            { id: "demo-box-3", name: "Caja 3 - Libros y Revistas", contents: "Libros de texto de cocina, novelas de ficción, revistas antiguas.", destRoomId: "demo-room-2", status: "packed", color: "#3b82f6" }
        ];

        // Demo material requests
        state.requests = [
            { id: "demo-req-1", material: "Harina y Levadura", senderId: "mem-1", senderRoomId: "demo-room-1", receiverId: "mem-2", status: "pendiente" }
        ];

        saveStateToStorage();
        deselectRoom();
        renderAllViews();
        addNotification("Cargada casa de demostración con éxito", "success");
    }
}

// --- MODAL UTILITIES ---
function openModal(id) {
    document.getElementById(id).classList.add("show");
}

function closeModal(id) {
    document.getElementById(id).classList.remove("show");
}
window.closeModal = closeModal; // Expose globally for HTML onclick inline handlers
window.switchTab = switchTab; // Expose globally
