(function () {
  "use strict";

  let dialog;
  let form;

  function getEventTitle(eventId) {
    const event = StorageModule.getData().events.find(function (item) {
      return item.id === eventId;
    });
    return event ? event.title : "Мероприятие удалено";
  }

  function fillEventSelect() {
    const select = document.getElementById("participantEvent");
    const events = StorageModule.getData().events;

    select.innerHTML = events
      .slice()
      .sort(function (first, second) {
        return first.date.localeCompare(second.date);
      })
      .map(function (event) {
        return '<option value="' + event.id + '">' + App.escapeHtml(event.title) + "</option>";
      })
      .join("");
  }

  function openForm() {
    if (!App.hasRole("manager")) {
      App.showToast("Для работы с участниками нужна роль управляющего");
      return;
    }

    const events = StorageModule.getData().events;
    if (!events.length) {
      App.showToast("Сначала создайте мероприятие");
      App.showPage("events");
      return;
    }

    form.reset();
    fillEventSelect();
    dialog.showModal();
  }

  // Добавляет участника и связывает его с выбранным мероприятием по id.
  function saveParticipant(submitEvent) {
    submitEvent.preventDefault();
    if (!App.hasRole("manager")) return;

    const data = StorageModule.getData();
    data.participants.push({
      id: StorageModule.nextId(data.participants),
      name: document.getElementById("participantName").value.trim(),
      email: document.getElementById("participantEmail").value.trim(),
      category: document.getElementById("participantCategory").value,
      eventId: Number(document.getElementById("participantEvent").value)
    });

    StorageModule.save();
    dialog.close();
    App.showToast("Участник зарегистрирован");
  }

  function deleteParticipant(id) {
    if (!App.hasRole("manager")) return;
    if (!confirm("Удалить участника из списка?")) return;

    const data = StorageModule.getData();
    data.participants = data.participants.filter(function (participant) {
      return participant.id !== id;
    });

    StorageModule.save();
    App.showToast("Участник удалён");
  }

  function render() {
    const participants = StorageModule.getData().participants;
    const tableBody = document.getElementById("participantsTableBody");

    if (!participants.length) {
      tableBody.innerHTML = App.emptyRow("Участников пока нет", 5);
      return;
    }

    tableBody.innerHTML = participants
      .map(function (participant) {
        return (
          "<tr>" +
          '<td><span class="cell-title">' + App.escapeHtml(participant.name) + "</span></td>" +
          "<td>" + App.escapeHtml(participant.email) + "</td>" +
          "<td>" + App.escapeHtml(participant.category) + "</td>" +
          "<td>" + App.escapeHtml(getEventTitle(participant.eventId)) + "</td>" +
          '<td><button class="action-button action-button-danger" type="button" data-delete-participant="' + participant.id + '">Удалить</button></td>' +
          "</tr>"
        );
      })
      .join("");
  }

  function init() {
    dialog = document.getElementById("participantDialog");
    form = document.getElementById("participantForm");

    document.getElementById("openParticipantForm").addEventListener("click", openForm);
    form.addEventListener("submit", saveParticipant);

    document.getElementById("participantsTableBody").addEventListener("click", function (clickEvent) {
      const button = clickEvent.target.closest("button[data-delete-participant]");
      if (!button) return;
      deleteParticipant(Number(button.dataset.deleteParticipant));
    });
  }

  window.ParticipantsModule = { init, render };
})();
