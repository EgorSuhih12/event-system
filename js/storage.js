(function () {
  "use strict";

  const STORAGE_KEY = "eventSupportLabData";

  const initialData = {
    events: [
      {
        id: 1,
        title: "Студенческая научная конференция",
        type: "Конференция",
        date: "2026-10-03",
        place: "Актовый зал, корпус А",
        format: "Очное",
        participants: 180,
        budget: 420000,
        status: "На согласовании"
      },
      {
        id: 2,
        title: "Семинар по цифровой грамотности",
        type: "Семинар",
        date: "2026-10-18",
        place: "Онлайн-платформа",
        format: "Онлайн",
        participants: 90,
        budget: 85000,
        status: "Одобрено"
      },
      {
        id: 3,
        title: "Фестиваль студенческих проектов",
        type: "Фестиваль",
        date: "2026-11-02",
        place: "Главный корпус",
        format: "Гибридное",
        participants: 350,
        budget: 760000,
        status: "Черновик"
      },
      {
        id: 4,
        title: "Встреча с работодателями",
        type: "Деловая встреча",
        date: "2026-09-10",
        place: "Конференц-зал",
        format: "Очное",
        participants: 75,
        budget: 120000,
        status: "Завершено"
      }
    ],
    participants: [
      {
        id: 1,
        name: "Анна Крылова",
        email: "anna.krylova@example.ru",
        category: "Студент",
        eventId: 1
      },
      {
        id: 2,
        name: "Павел Громов",
        email: "pavel.gromov@example.ru",
        category: "Сотрудник",
        eventId: 1
      },
      {
        id: 3,
        name: "Ирина Волкова",
        email: "irina.volkova@example.ru",
        category: "Гость",
        eventId: 2
      }
    ],
    profile: {
      name: "Егор Макаров",
      email: "egor.makarov@example.ru",
      role: "admin"
    }
  };

  function copyInitialData() {
    return JSON.parse(JSON.stringify(initialData));
  }

  // Загружает данные из браузера. При первом запуске используются примеры.
  function load() {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (!savedData) return copyInitialData();

      const parsedData = JSON.parse(savedData);
      if (!Array.isArray(parsedData.events) || !Array.isArray(parsedData.participants)) {
        return copyInitialData();
      }

      const defaultProfile = copyInitialData().profile;
      const savedProfile = parsedData.profile || {};
      const availableRoles = ["user", "manager", "admin"];

      return {
        events: parsedData.events,
        participants: parsedData.participants,
        profile: {
          name: savedProfile.name || defaultProfile.name,
          email: savedProfile.email || defaultProfile.email,
          role: availableRoles.includes(savedProfile.role) ? savedProfile.role : defaultProfile.role
        }
      };
    } catch (error) {
      console.warn("Не удалось прочитать LocalStorage:", error);
      return copyInitialData();
    }
  }

  const data = load();

  // Сохраняет единое состояние и сообщает интерфейсу, что таблицы нужно обновить.
  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn("Не удалось сохранить данные в LocalStorage:", error);
    }

    window.dispatchEvent(new CustomEvent("app:data-changed"));
  }

  function nextId(collection) {
    const ids = collection.map((item) => Number(item.id) || 0);
    return ids.length ? Math.max(...ids) + 1 : 1;
  }

  window.StorageModule = {
    getData: function () {
      return data;
    },
    save,
    nextId
  };
})();
