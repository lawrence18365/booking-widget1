document.addEventListener('DOMContentLoaded', function() {
    const authStatusEl = document.getElementById('auth-status');
    const authLinkEl = document.getElementById('auth-link');
    const bookingContentEl = document.getElementById('booking-content');
    const serviceDropdownEl = document.getElementById('service-dropdown');
    const serviceDescriptionEl = document.getElementById('service-description');
    const serviceDurationEl = document.getElementById('service-duration');
    const servicePriceEl = document.getElementById('service-price');
    const inlineCalendarEl = document.getElementById('inline-calendar');
    const timeSlotsEl = document.getElementById('time-slots');
    const bookingFormEl = document.getElementById('booking-form');
    const bookingSummaryEl = document.getElementById('booking-summary');
    const upcomingAppointmentsEl = document.getElementById('upcoming-appointments');
    
    let selectedDate;
    let selectedSlot;
    let selectedService;
    let calendar;

    const socket = io();

    const services = [
        { id: 1, name: 'Haircut', description: 'Standard haircut service', duration: 30, price: 30 },
        { id: 2, name: 'Manicure', description: 'Basic manicure service', duration: 45, price: 25 },
        { id: 3, name: 'Massage', description: '60-minute full body massage', duration: 60, price: 60 }
    ];

    function populateServices() {
        services.forEach(service => {
            const option = document.createElement('option');
            option.value = service.id;
            option.textContent = service.name;
            serviceDropdownEl.appendChild(option);
        });
    }

    function updateServiceInfo() {
        const serviceId = parseInt(serviceDropdownEl.value);
        selectedService = services.find(service => service.id === serviceId);
        if (selectedService) {
            serviceDescriptionEl.textContent = selectedService.description;
            serviceDurationEl.textContent = `Duration: ${selectedService.duration} minutes`;
            servicePriceEl.textContent = `Price: $${selectedService.price}`;
            updateBookingSummary();
        } else {
            serviceDescriptionEl.textContent = '';
            serviceDurationEl.textContent = '';
            servicePriceEl.textContent = '';
        }
    }

    function initializeCalendar() {
        calendar = flatpickr(inlineCalendarEl, {
            inline: true,
            minDate: "today",
            maxDate: new Date().fp_incr(30),
            dateFormat: "Y-m-d",
            onChange: function(selectedDates, dateStr) {
                selectedDate = dateStr;
                fetchAvailableSlots(dateStr);
            }
        });
    }

    function fetchAvailableSlots(date) {
        fetch(`/available-slots?date=${date}&duration=${selectedService ? selectedService.duration : 30}`)
            .then(response => response.json())
            .then(slots => {
                displayTimeSlots(slots);
            })
            .catch(error => console.error('Error:', error));
    }

    function displayTimeSlots(slots) {
        timeSlotsEl.innerHTML = '';
        if (slots.length === 0) {
            timeSlotsEl.innerHTML = '<p class="error-message">No available slots for this date.</p>';
            return;
        }
        slots.forEach(slot => {
            const button = document.createElement('button');
            button.textContent = slot;
            button.addEventListener('click', () => selectTimeSlot(button, slot));
            timeSlotsEl.appendChild(button);
        });
    }

    function selectTimeSlot(button, slot) {
        const buttons = timeSlotsEl.getElementsByTagName('button');
        for (let btn of buttons) {
            btn.classList.remove('selected');
        }
        button.classList.add('selected');
        selectedSlot = slot;
        updateBookingSummary();
    }

    function updateBookingSummary() {
        if (selectedService && selectedDate && selectedSlot) {
            bookingSummaryEl.innerHTML = `
                <strong>Booking Summary:</strong><br>
                Service: ${selectedService.name}<br>
                Date: ${selectedDate}<br>
                Time: ${selectedSlot}<br>
                Duration: ${selectedService.duration} minutes<br>
                Price: $${selectedService.price}
            `;
        } else {
            bookingSummaryEl.innerHTML = '';
        }
    }

    bookingFormEl.addEventListener('submit', function(e) {
        e.preventDefault();
        if (!selectedService || !selectedDate || !selectedSlot) {
            alert('Please select a service, date, and time slot');
            return;
        }

        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
        const notes = document.getElementById('notes').value;

        const bookingData = {
            serviceId: selectedService.id,
            date: selectedDate,
            time: selectedSlot,
            name: name,
            email: email,
            phone: phone,
            notes: notes
        };

        fetch('/book-appointment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bookingData),
        })
        .then(response => response.json())
        .then(data => {
            bookingFormEl.reset();
            selectedDate = null;
            selectedSlot = null;
            selectedService = null;
            serviceDropdownEl.value = '';
            calendar.clear();
            timeSlotsEl.innerHTML = '';
            bookingSummaryEl.innerHTML = '';
            updateServiceInfo();
            bookingContentEl.innerHTML += '<p class="success-message">Appointment booked successfully!</p>';
            fetchUpcomingAppointments();
        })
        .catch((error) => {
            console.error('Error:', error);
            bookingContentEl.innerHTML += '<p class="error-message">An error occurred while booking the appointment. Please try again.</p>';
        });
    });

    function fetchUpcomingAppointments() {
        fetch('/upcoming-appointments')
            .then(response => response.json())
            .then(appointments => {
                displayUpcomingAppointments(appointments);
            })
            .catch(error => console.error('Error:', error));
    }

    function displayUpcomingAppointments(appointments) {
        upcomingAppointmentsEl.innerHTML = '<h3>Upcoming Appointments</h3>';
        if (appointments.length === 0) {
            upcomingAppointmentsEl.innerHTML += '<p>No upcoming appointments.</p>';
            return;
        }
        const ul = document.createElement('ul');
        appointments.forEach(appointment => {
            const li = document.createElement('li');
            li.textContent = `${appointment.service} on ${appointment.date} at ${appointment.time}`;
            ul.appendChild(li);
        });
        upcomingAppointmentsEl.appendChild(ul);
    }

    function checkAuthStatus() {
        fetch('/auth-check')
            .then(response => response.json())
            .then(data => {
                if (data.authenticated) {
                    authStatusEl.textContent = 'Calendar connected';
                    authLinkEl.style.display = 'none';
                    bookingContentEl.style.display = 'block';
                    initializeCalendar();
                    populateServices();
                    fetchUpcomingAppointments();
                } else {
                    authStatusEl.textContent = 'Calendar not connected';
                    authLinkEl.style.display = 'inline-block';
                    bookingContentEl.style.display = 'none';
                }
            })
            .catch(error => console.error('Error:', error));
    }

    authLinkEl.