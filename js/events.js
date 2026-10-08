(function () {
  "use strict";

  let dialog;
  let form;

  function getEventById(id) {
    return StorageModule.getData().events.find(function (event) {
      return event.id === Number(id);
    });
  }

  function openForm(eventId) {
    if (!App.hasRole("manager")) {
      App.showToast("Для изменения мероприятий нужна роль управляющего");
      return;
    }

    form.reset();
    document.getElementById("eventId").value = "";
    document.getElementById("eventStatus").value = "Черновик";
    document.getElementById("eventDialogTitle").textContent = "Новое мероприятие";

    if (eventId) {
      const event = getEventById(eventId);
      if (!event) return;

      document.getElementById("eventDialogTitle").textContent = "Редактирование мероприятия";
      document.getElementById("eventId").value = event.id;
      document.getElementById("eventName").value = event.title;
      document.getElementById("eventType").value = event.type;
      document.getElementById("eventDate").value = event.date;
      document.getElementById("eventPlace").value = event.place;
      document.getElementById("eventFormat").value = event.format;
      document.getElementById("eventParticipants").value = event.participants;
      document.getElementById("eventBudget").value = event.budget;
      document.getElementById("eventStatus").value = event.status;
    }

    dialog.showModal();
  }

  // Одна форма используется и для создания, и для редактирования мероприятия.
  function saveEvent(submitEvent) {
    submitEvent.preventDefault();
    if (!App.hasRole("manager")) return;

    const data = StorageModule.getData();
    const id = Number(document.getElementById("eventId").value);
    const eventData = {
      title: document.getElementById("eventName").value.trim(),
      type: document.getElementById("eventType").value,
      date: document.getElementById("eventDate").value,
      place: document.getElementById("eventPlace").value.trim(),
      format: document.getElementById("eventFormat").value,
      participants: Number(document.getElementById("eventParticipants").value),
      budget: Number(document.getElementById("eventBudget").value),
      status: document.getElementById("eventStatus").value
    };

    if (id) {
      const event = getEventById(id);
      Object.assign(event, eventData);
      App.showToast("Изменения сохранены");
    } else {
      data.events.push({ id: StorageModule.nextId(data.events), ...eventData });
      App.showToast("Мероприятие создано");
    }

    StorageModule.save();
    dialog.close();
  }

  function deleteEvent(id) {
    if (!App.hasRole("manager")) return;

    const data = StorageModule.getData();
    const event = getEventById(id);
    if (!event) return;

    const confirmed = confirm('Удалить мероприятие "' + event.title + '"? Связанные участники также будут удалены.');
    if (!confirmed) return;

    data.events = data.events.filter(function (item) {
      return item.id !== event.id;
    });
    data.participants = data.participants.filter(function (participant) {
      return participant.eventId !== event.id;
    });

    StorageModule.save();
    App.showToast("Мероприятие удалено");
  }

  function changeStatus(id, status, message) {
    const event = getEventById(id);
    if (!event) return;

    event.status = status;
    StorageModule.save();
    App.showToast(message);
  }

  function renderEventsTable() {
    const events = StorageModule.getData().events;
    const tableBody = document.getElementById("eventsTableBody");
    const canManage = App.hasRole("manager");
    document.getElementById("eventsActionsHeader").hidden = !canManage;

    if (!events.length) {
      tableBody.innerHTML = App.emptyRow("Мероприятий пока нет", canManage ? 8 : 7);
      return;
    }

    tableBody.innerHTML = events
      .slice()
      .sort(function (first, second) {
        return first.date.localeCompare(second.date);
      })
      .map(function (event) {
        const submitButton =
          event.status === "Черновик"
            ? '<button class="action-button" type="button" data-action="submit" data-id="' +
              event.id +
              '">На согласование</button>'
            : "";
        const completeButton =
          event.status === "Одобрено"
            ? '<button class="action-button" type="button" data-action="complete" data-id="' +
              event.id +
              '">Завершить</button>'
            : "";

        const actionsCell = canManage
          ? '<td><div class="table-actions">' +
            submitButton +
            completeButton +
            '<button class="action-button" type="button" data-action="edit" data-id="' + event.id + '">Изменить</button>' +
            '<button class="action-button action-button-danger" type="button" data-action="delete" data-id="' + event.id + '">Удалить</button>' +
            "</div></td>"
          : "";

        return (
          "<tr>" +
          '<td><span class="cell-title">' + App.escapeHtml(event.title) + "</span></td>" +
          "<td>" + App.escapeHtml(event.type) + "</td>" +
          '<td><span class="cell-title">' + App.formatDate(event.date) + '</span><span class="cell-note">' + App.escapeHtml(event.place) + "</span></td>" +
          "<td>" + App.escapeHtml(event.format) + "</td>" +
          "<td>" + event.participants + "</td>" +
          "<td>" + App.formatMoney(event.budget) + "</td>" +
          "<td>" + App.statusBadge(event.status) + "</td>" +
          actionsCell +
          "</tr>"
        );
      })
      .join("");
  }

  function renderApprovals() {
    const waitingEvents = StorageModule.getData().events.filter(function (event) {
      return event.status === "На согласовании";
    });
    const list = document.getElementById("approvalList");

    if (!waitingEvents.length) {
      list.innerHTML =
        '<div class="empty-block"><strong>Нет мероприятий на согласовании</strong><span>Новые заявки появятся здесь после отправки организатором.</span></div>';
      return;
    }

    list.innerHTML = waitingEvents
      .map(function (event) {
        return (
          '<article class="approval-card">' +
          "<div>" +
          "<h3>" + App.escapeHtml(event.title) + "</h3>" +
          App.statusBadge(event.status) +
          '<div class="approval-meta">' +
          "<span>Дата: " + App.formatDate(event.date) + "</span>" +
          "<span>Формат: " + App.escapeHtml(event.format) + "</span>" +
          "<span>Бюджет: " + App.formatMoney(event.budget) + "</span>" +
          "</div>" +
          "</div>" +
          '<div class="approval-actions">' +
          '<button class="button button-success button-small" type="button" data-approval="approve" data-id="' + event.id + '">Одобрить</button>' +
          '<button class="button button-danger button-small" type="button" data-approval="reject" data-id="' + event.id + '">Отклонить</button>' +
          "</div>" +
          "</article>"
        );
      })
      .join("");
  }

  function render() {
    renderEventsTable();
    renderApprovals();
  }

  function init() {
    dialog = document.getElementById("eventDialog");
    form = document.getElementById("eventForm");

    document.querySelectorAll("[data-open-event-form]").forEach(function (button) {
      button.addEventListener("click", function () {
        openForm();
      });
    });

    form.addEventListener("submit", saveEvent);

    document.getElementById("eventsTableBody").addEventListener("click", function (clickEvent) {
      const button = clickEvent.target.closest("button[data-action]");
      if (!button) return;
      if (!App.hasRole("manager")) return;

      const id = Number(button.dataset.id);
      if (button.dataset.action === "edit") openForm(id);
      if (button.dataset.action === "delete") deleteEvent(id);
      if (button.dataset.action === "submit") {
        changeStatus(id, "На согласовании", "Мероприятие отправлено на согласование");
      }
      if (button.dataset.action === "complete") {
        changeStatus(id, "Завершено", "Мероприятие отмечено как завершённое");
      }
    });

    document.getElementById("approvalList").addEventListener("click", function (clickEvent) {
      const button = clickEvent.target.closest("button[data-approval]");
      if (!button) return;
      if (!App.hasRole("admin")) return;

      const id = Number(button.dataset.id);
      if (button.dataset.approval === "approve") {
        changeStatus(id, "Одобрено", "Мероприятие одобрено");
      } else {
        changeStatus(id, "Черновик", "Мероприятие возвращено организатору");
      }
    });
  }

  window.EventsModule = { init, render, openForm };
})();
