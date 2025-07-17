document.addEventListener("DOMContentLoaded", () => {

  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const searchInput = document.getElementById("search-input");
  const categoryFilter = document.getElementById("category-filter");
  const sortSelect = document.getElementById("sort-select");

  let allActivities = {};

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();
      allActivities = activities;
      renderActivities();
      populateCategoryFilter();
      populateActivityDropdown();
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  function getFilteredSortedActivities() {
    let entries = Object.entries(allActivities);

    // Filter by category
    const selectedCategory = categoryFilter?.value || "";
    if (selectedCategory) {
      entries = entries.filter(([, details]) =>
        details.category === selectedCategory
      );
    }

    // Search by name/description
    const search = searchInput?.value?.toLowerCase() || "";
    if (search) {
      entries = entries.filter(([name, details]) =>
        name.toLowerCase().includes(search) ||
        (details.description && details.description.toLowerCase().includes(search))
      );
    }

    // Sort
    const sortBy = sortSelect?.value || "name";
    if (sortBy === "name") {
      entries.sort((a, b) => a[0].localeCompare(b[0]));
    } else if (sortBy === "time") {
      entries.sort((a, b) => {
        const tA = a[1].schedule || "";
        const tB = b[1].schedule || "";
        return tA.localeCompare(tB);
      });
    }
    return entries;
  }

  function renderActivities() {
    activitiesList.innerHTML = "";
    const entries = getFilteredSortedActivities();
    if (entries.length === 0) {
      activitiesList.innerHTML = "<p>No activities found.</p>";
      return;
    }
    entries.forEach(([name, details]) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";

      const spotsLeft =
        details.max_participants - details.participants.length;

      const participantsHTML =
        details.participants.length > 0
          ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button></li>`
                  )
                  .join("")}
              </ul>
            </div>`
          : `<p><em>No participants yet</em></p>`;

      activityCard.innerHTML = `
        <h4>${name}</h4>
        <p>${details.description}</p>
        <p><strong>Schedule:</strong> ${details.schedule}</p>
        <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
        <div class="participants-container">
          ${participantsHTML}
        </div>
      `;

      activitiesList.appendChild(activityCard);
    });
    // Add event listeners to delete buttons
    document.querySelectorAll(".delete-btn").forEach((button) => {
      button.addEventListener("click", handleUnregister);
    });
  }

  function populateCategoryFilter() {
    if (!categoryFilter) return;
    // Get unique categories
    const categories = Array.from(
      new Set(
        Object.values(allActivities)
          .map((a) => a.category)
          .filter(Boolean)
      )
    );
    // Remove old options except 'All Categories'
    categoryFilter.innerHTML = '<option value="">All Categories</option>';
    categories.forEach((cat) => {
      const opt = document.createElement("option");
      opt.value = cat;
      opt.textContent = cat;
      categoryFilter.appendChild(opt);
    });
  }

  function populateActivityDropdown() {
    if (!activitySelect) return;
    // Save current selection
    const current = activitySelect.value;
    // Remove all except the first option
    activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';
    const entries = getFilteredSortedActivities();
    entries.forEach(([name]) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      activitySelect.appendChild(option);
    });
    // Restore selection if possible
    if (current) activitySelect.value = current;
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Event listeners for filters
  if (searchInput) searchInput.addEventListener("input", () => {
    renderActivities();
    populateActivityDropdown();
  });
  if (categoryFilter) categoryFilter.addEventListener("change", () => {
    renderActivities();
    populateActivityDropdown();
  });
  if (sortSelect) sortSelect.addEventListener("change", () => {
    renderActivities();
    populateActivityDropdown();
  });

  // Initialize app
  fetchActivities();
});
