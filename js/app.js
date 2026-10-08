(function () {
  "use strict";

  const pageTitles = {
    dashboard: "Главная",
    events: "Мероприятия",
    participants: "Участники",
    approvals: "Согласование",
    profile: "Профиль"
  };

  const roleLevels = {
    user: 1,
    manager: 2,
    admin: 3
  };

  const roleDetails = {
    user: {
      label: "Обычный пользователь",
      capabilities: "Просмотр панели управления и списка мероприятий"
    },
    manager: {
      label: "Управляющий",
      capabilities: "Создание мероприятий, работа с участниками и отправка на согласование"
    },
    admin: {
      label: "Администратор",
      capabilities: "Полный доступ к мероприятиям, участникам и принятию решений"
    }
  };

  function currentRole() {
    return StorageModule.getData().profile.role;
  }

  function hasRole(minimumRole) {
    return roleLevels[currentRole()] >= roleLevels[minimumRole];
  }

  function canOpenPage(pageName) {
    if (pageName === "participants") return hasRole("manager");
    if (pageName === "approvals") return hasRole("admin");
    return Boolean(pageTitles[pageName]);
  }

  function escapeHtml(value) {
    const characters = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };

    return String(value).replace(/[&<>"']/g, function (character) {
      return characters[character];
    });
  }

  function formatDate(value) {
    if (!value) return "—";
    return new Intl.DateTimeFormat("ru-RU").format(new Date(value + "T12:00:00"));
  }

  function formatMoney(value) {
    return new Intl.NumberFormat("ru-RU").format(Number(value) || 0) + " ₽";
  }

  function statusClass(status) {
    const classes = {
      "Черновик": "status-draft",
      "На согласовании": "status-review",
      "Одобрено": "status-approved",
      "Завершено": "status-completed"
    };
    return classes[status] || "status-draft";
  }

  function statusBadge(status) {
    return '<span class="status ' + statusClass(status) + '">' + escapeHtml(status) + "</span>";
  }

  function emptyRow(message, columns) {
    return '<tr class="empty-row"><td colspan="' + columns + '">' + escapeHtml(message) + "</td></tr>";
  }

  function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("visible");

    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(function () {
      toast.classList.remove("visible");
    }, 2600);
  }

  function showPage(pageName) {
    if (!pageTitles[pageName]) return;
    if (!canOpenPage(pageName)) pageName = "dashboard";

    document.querySelectorAll(".page").forEach(function (page) {
      page.classList.toggle("active", page.id === pageName);
    });

    document.querySelectorAll(".nav-button").forEach(function (button) {
      button.classList.toggle("active", button.dataset.page === pageName);
    });

    const nav = document.getElementById("mainNav");
    const menuButton = document.getElementById("menuButton");
    nav.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");

    document.title = pageTitles[pageName] + " — Система сопровождения мероприятий";
    history.replaceState(null, "", "#" + pageName);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderDashboard() {
    const data = StorageModule.getData();
    const waitingEvents = data.events.filter(function (event) {
      return event.status === "На согласовании";
    });

    document.getElementById("eventsCount").textContent = data.events.length;
    document.getElementById("participantsCount").textContent = data.participants.length;
    document.getElementById("approvalsCount").textContent = waitingEvents.length;

    const upcoming = data.events
      .filter(function (event) {
        return event.status !== "Завершено";
      })
      .sort(function (first, second) {
        return first.date.localeCompare(second.date);
      })
      .slice(0, 5);

    const tableBody = document.getElementById("upcomingEventsBody");
    if (!upcoming.length) {
      tableBody.innerHTML = emptyRow("Ближайших мероприятий пока нет", 5);
      return;
    }

    tableBody.innerHTML = upcoming
      .map(function (event) {
        return (
          "<tr>" +
          '<td><span class="cell-title">' + escapeHtml(event.title) + "</span></td>" +
          "<td>" + formatDate(event.date) + "</td>" +
          "<td>" + escapeHtml(event.place) + "</td>" +
          "<td>" + escapeHtml(event.format) + "</td>" +
          "<td>" + statusBadge(event.status) + "</td>" +
          "</tr>"
        );
      })
      .join("");
  }

  function getInitials(name) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map(function (part) {
        return part.charAt(0).toUpperCase();
      })
      .join("") || "П";
  }

  function renderProfile() {
    const profile = StorageModule.getData().profile;
    const role = roleDetails[profile.role];
    const roleBadge = document.getElementById("profileRoleBadge");

    document.getElementById("headerRoleLabel").textContent = role.label;
    document.getElementById("profileDisplayName").textContent = profile.name;
    document.getElementById("profileDisplayEmail").textContent = profile.email;
    document.getElementById("profileAvatar").textContent = getInitials(profile.name);
    document.getElementById("profileName").value = profile.name;
    document.getElementById("profileEmail").value = profile.email;
    document.getElementById("roleCapabilities").textContent = role.capabilities;

    roleBadge.textContent = role.label;
    roleBadge.className = "status " + (profile.role === "admin" ? "status-approved" : profile.role === "manager" ? "status-review" : "status-draft");

    document.querySelectorAll('input[name="userRole"]').forEach(function (input) {
      input.checked = input.value === profile.role;
    });

    document.querySelectorAll("[data-min-role]").forEach(function (element) {
      element.hidden = !hasRole(element.dataset.minRole);
    });
  }

  function renderAll() {
    renderProfile();
    renderDashboard();
    if (window.EventsModule) EventsModule.render();
    if (window.ParticipantsModule) ParticipantsModule.render();
  }

  function setupNavigation() {
    document.querySelectorAll("[data-page]").forEach(function (button) {
      button.addEventListener("click", function () {
        showPage(button.dataset.page);
      });
    });

    document.querySelectorAll("[data-page-jump]").forEach(function (button) {
      button.addEventListener("click", function () {
        showPage(button.dataset.pageJump);
      });
    });

    document.querySelector("[data-page-link]").addEventListener("click", function (event) {
      event.preventDefault();
      showPage("dashboard");
    });

    const menuButton = document.getElementById("menuButton");
    const nav = document.getElementById("mainNav");
    menuButton.addEventListener("click", function () {
      const isOpen = nav.classList.toggle("open");
      menuButton.setAttribute("aria-expanded", String(isOpen));
    });
  }

  function setupDialogs() {
    document.querySelectorAll("[data-close-dialog]").forEach(function (button) {
      button.addEventListener("click", function () {
        button.closest("dialog").close();
      });
    });

    document.querySelectorAll("dialog").forEach(function (dialog) {
      dialog.addEventListener("click", function (event) {
        if (event.target === dialog) dialog.close();
      });
    });
  }

  function setupProfile() {
    document.getElementById("profileForm").addEventListener("submit", function (submitEvent) {
      submitEvent.preventDefault();

      const profile = StorageModule.getData().profile;
      profile.name = document.getElementById("profileName").value.trim();
      profile.email = document.getElementById("profileEmail").value.trim();
      StorageModule.save();
      showToast("Профиль сохранён");
    });

    document.querySelectorAll('input[name="userRole"]').forEach(function (input) {
      input.addEventListener("change", function () {
        if (!input.checked) return;

        StorageModule.getData().profile.role = input.value;
        StorageModule.save();

        const activePage = document.querySelector(".page.active");
        if (activePage && !canOpenPage(activePage.id)) showPage("dashboard");
        showToast("Роль изменена: " + roleDetails[input.value].label);
      });
    });
  }

  window.App = {
    escapeHtml,
    formatDate,
    formatMoney,
    statusBadge,
    emptyRow,
    showToast,
    showPage,
    renderAll,
    hasRole
  };

  document.addEventListener("DOMContentLoaded", function () {
    setupNavigation();
    setupDialogs();
    setupProfile();
    EventsModule.init();
    ParticipantsModule.init();
    renderAll();

    const initialPage = location.hash.slice(1);
    showPage(pageTitles[initialPage] ? initialPage : "dashboard");
  });

  window.addEventListener("app:data-changed", renderAll);
})();
