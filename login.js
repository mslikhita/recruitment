// This script can handle any client-side interactions you may need, such as form validation.

// Example: Ensure form submission only with valid email
const loginForm = document.getElementById('loginForm');
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const emailInput = document.getElementById('email');
    const email = emailInput.value.trim();

    validateEmail();
    loginForm.submit();

});
   

function validateEmail() {
    const emailInput = document.getElementById('email');
    const email = emailInput.value;
    const domain = '@samarthainfo.com';
   
    if (!email.endsWith(domain)) {
        alert('Enter a valid email-id that ends with @samarthainfo.com');
        return false;
    }
    return true;
}