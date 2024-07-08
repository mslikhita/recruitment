document.addEventListener("DOMContentLoaded", function() {
    const url = "http://localhost:3005/candidate";
    const steps = document.querySelectorAll("fieldset");
    let currentStep = 0;

    function showStep(step) {
        steps.forEach((stepElement, index) => {
            stepElement.style.display = index === step ? "block" : "none";
        });

        const nextButtons = document.querySelectorAll(".next");
        const prevButtons = document.querySelectorAll(".prev");
        const submitButton = document.querySelector("button[type='submit']");

        if (step === 0) {
            prevButtons.forEach(button => button.style.display = "none");
            nextButtons.forEach(button => button.style.display = "inline-block");
            submitButton.style.display = "none";
        } else if (step === steps.length - 1) {
            nextButtons.forEach(button => button.style.display = "none");
            prevButtons.forEach(button => button.style.display = "inline-block");
            submitButton.style.display = "inline-block";
        } else {
            prevButtons.forEach(button => button.style.display = "inline-block");
            nextButtons.forEach(button => button.style.display = "inline-block");
            submitButton.style.display = "none";
        }
    }

    function goToStep(step) {
        if (step >= 0 && step < steps.length) {
            currentStep = step;
            showStep(currentStep);
        }
    }

    document.getElementById("candidate-form").addEventListener("submit", function(event) {
        event.preventDefault();
        if (validateForm()) {
            submitForm();
        } else {
            alert("Please fill out all required fields.");
        }
    });

    document.getElementById("job_portal").addEventListener("change", function() {
        const jobPortal = document.getElementById("job_portal").value;
        const referedByField = document.getElementById("refered_by_field");
        if (jobPortal === "reference") {
            referedByField.style.display = "block";
            document.getElementById("referedby").setAttribute("required", true);
        } else {
            referedByField.style.display = "none";
            document.getElementById("referedby").removeAttribute("required");
        }
    });

    document.querySelectorAll(".next").forEach(button => {
        button.addEventListener("click", () => {
            if (validateStep(currentStep)) {
                const nextStep = currentStep + 1;
                goToStep(nextStep);
            } else {
                alert("Please fill out all required fields.");
            }
        });
    });

    document.querySelectorAll(".prev").forEach(button => {
        button.addEventListener("click", () => {
            const prevStep = currentStep - 1;
            goToStep(prevStep);
        });
    });

    function validateStep(step) {
        const inputs = steps[step].querySelectorAll("input, select");
        let isValid = true;
        inputs.forEach(input => {
            if (input.checkValidity && !input.checkValidity()) {
                isValid = false;
                const errorMessage = input.nextElementSibling;
                if (errorMessage && errorMessage.classList.contains("error-message")) {
                    errorMessage.style.display = "block";
                }
            } else {
                const errorMessage = input.nextElementSibling;
                if (errorMessage && errorMessage.classList.contains("error-message")) {
                    errorMessage.style.display = "none";
                }
            }
        });
        return isValid;
    }

    function validateForm() {
        let isValid = true;
        steps.forEach((step, index) => {
            if (index <= currentStep && !validateStep(index)) {
                isValid = false;
            }
        });
        return isValid;
    }

    function submitForm() {
        const referedByField = document.getElementById("refered_by_field");
        if (referedByField.style.display === "none") {
            document.getElementById("referedby").value = "";
        }

        const formData = new FormData(document.getElementById("candidate-form"));
        const options = {
            method: 'POST',
            body: formData,
        };

        fetch(url, options)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log(data);
            alert("Candidate successfully added!");
            resetForm();
            setTimeout(function() {
                window.location.href = 'candidatelist.html';
            }, 1000); // Redirect after 2 seconds (adjust as needed)
        
        })
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
            alert("An error occurred: " + error.message);
        });
    }

    function resetForm() {
        document.getElementById("candidate-form").reset();
        document.getElementById("refered_by_field").style.display = "none";
        currentStep = 0;
        showStep(currentStep);
    }

    showStep(currentStep);
});