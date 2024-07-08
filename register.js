document.getElementById('registerForm').addEventListener('submit', function(event) {
    const emailInput = document.getElementById('email').value;
    if (!emailInput.endsWith('@samarthainfo.com')) {
        alert('Please enter an email ends with domain samarthainfo.com.');
        event.preventDefault(); // Prevent form submission
    }
});




// Handle form submission
document.getElementById('registerForm').addEventListener('submit', async function(event) {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('Network response was not ok.');
        }

        const result = await response.json();

        // Clear previous error messages
        document.getElementById('eid-error').textContent = '';
        document.getElementById('email-error').textContent = '';

        if (!result.success) {
            if (result.errors) {
                result.errors.forEach(error => {
                    if (error.field === 'eid') {
                        document.getElementById('eid-error').textContent = error.message;
                    } else if (error.field === 'email') {
                        document.getElementById('email-error').textContent = error.message;
                    }
                });
            }
        } else {
            // Registration successful, redirect or show success message
            alert('Registration successful! Redirecting to login...');
            window.location.href = '/login.html';
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred. Please try again later.');
    }
});


    const eidInput = document.getElementById("eid");
    eidInput.addEventListener("keypress", preventSpecialChars);

function validateEid() {
    const eid = document.getElementById("eid").value;
    const eidError = document.getElementById("eid-error");
    const eidRegex = /^\d{1,6}$/;

    if (!eidRegex.test(eid)) {
        eidError.textContent = "Employee ID must be between 1 and 6 digits with no special characters.";
        return false;
    } else {
        eidError.textContent = "";
        return true;
    }
}

function preventSpecialChars(event) {
    const keyCode = event.keyCode || event.which;
    const keyValue = String.fromCharCode(keyCode);
    const regex = /^[0-9\b]+$/;  // Allow only digits and backspace

    if (!regex.test(keyValue)) {
        event.preventDefault();
    }
}

function validateEmployeeName() {
    const employeeName = document.getElementById("employeeName").value;
    const nameError = document.getElementById("name-error");

    if (employeeName.length > 60) {
        nameError.textContent = "Employee Name must not be more than 60 characters.";
        return false;
    } else {
        nameError.textContent = "";
        return true;
    }
}



