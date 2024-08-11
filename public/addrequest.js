document.addEventListener('DOMContentLoaded', function () {
    const emailInput = document.getElementById('recruiter_email');
    const emailMessage = document.getElementById('emailMessage');

    emailInput.addEventListener('focus', function() {
        emailMessage.style.display = 'block';
    });

    emailInput.addEventListener('blur', function() {
        emailMessage.style.display = 'none';
    });

    document.getElementById('requestForm').addEventListener('submit', function (event) {
        event.preventDefault();

        // Validation: Check if required fields are filled
        const eid = document.getElementById('eid').value.trim();
        const recruiterEmail = document.getElementById('recruiter_email').value.trim();
        const designation = document.getElementById('designation').value.trim();
        const experience = document.getElementById('experience').value.trim();
        const jobDescription = document.getElementById('jobDescription').value.trim();

        // Validation: Check if designation contains only letters and spaces
        if (!/^[a-zA-Z\s]*$/.test(designation)) {
            document.getElementById('message').innerText = 'Designation should contain only letters and spaces.';
            return;
        }

        // Validation: Check if jobDescription contains only letters and spaces
        if (!/^[a-zA-Z\s]*$/.test(jobDescription)) {
            document.getElementById('message').innerText = 'Job description should contain only letters and spaces.';
            return;
        }

        // Validation: Check if recruiterEmail ends with @samarthainfo.com for all addresses
        const emailAddresses = recruiterEmail.split(',').map(email => email.trim());
        const validEmailPattern = /^[a-zA-Z0-9._%+-]+@samarthainfo\.com$/;

        if (emailAddresses.some(email => !validEmailPattern.test(email))) {
            document.getElementById('message').innerText = 'Please enter valid email addresses ending with @samarthainfo.com, separated by commas.';
            return;
        }

        // Additional validation for required fields
        if (!eid || !recruiterEmail || !designation || !experience || !jobDescription) {
            document.getElementById('message').innerText = 'Please fill out all required fields.';
            return;
        }

        // Get selected skills
        const skillsSelect = document.getElementById('skills');
        const selectedSkills = Array.from(skillsSelect.selectedOptions).map(option => option.value);

        if (selectedSkills.length === 0) {
            document.getElementById('message').innerText = 'Please select at least one skill.';
            return;
        }

        // Prepare FormData
        const formData = new FormData();
        formData.append('eid', eid);
        formData.append('recruiter_email', recruiterEmail);
        formData.append('designation', designation);
        formData.append('experience', experience);
        formData.append('job_description_text', jobDescription);

        // Append selected skills to FormData
        selectedSkills.forEach(skill => {
            formData.append('skills[]', skill);
        });

        // Append job description file if provided
        const fileInput = document.getElementById('jobDescriptionFile').files[0];
        if (fileInput) {
            formData.append('job_description_file', fileInput);
        }

        // Submit form data via fetch
        fetch('http://localhost:3000/requests', {
            method: 'POST',
            body: formData
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            document.getElementById('message').innerText = data.message;
            document.getElementById('requestForm').reset();

            // Navigate to viewrequest.html after displaying success message
            setTimeout(function() {
                window.location.href = 'viewrequest.html';
            }, 2000); // Redirect after 2 seconds (adjust as needed)
        })
        .catch(error => {
            console.error('Error:', error);
            document.getElementById('message').innerText = 'An error occurred while submitting the request';
        });
    });
});
