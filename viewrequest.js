let jobRequests = [];
let filteredJobRequests = []; // Array to hold filtered job requests
const itemsPerPage = 10;
let currentPage = 1;
let currentRequestId = null; // Track current request ID for displaying candidates
let searchColumn = 'user_name'; // Default search column

document.addEventListener('DOMContentLoaded', function() {
    fetchJobRequests();
    setupPagination();
    closePopup(); // Ensure the popup is hidden when the page loads
});

async function fetchJobRequests() {
    try {
        const response = await fetch("http://localhost:3000/requests");
        if (!response.ok) {
            throw new Error(`Failed to fetch job requests: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        jobRequests = data;
        filteredJobRequests = jobRequests; // Initialize filtered job requests with all job requests
        displayJobRequests();
    } catch (error) {
        console.error('Error fetching job requests:', error);
        alert('Failed to fetch job requests. Please try again later.');
    }
}

function setupPagination() {
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');

    if (prevPageBtn && nextPageBtn) {
        prevPageBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                displayJobRequests();
            }
        });

        nextPageBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(filteredJobRequests.length / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                displayJobRequests();
            }
        });
    } else {
        console.error('Pagination buttons not found.');
    }
}

function renderPagination(totalItems) {
    const paginationControls = document.getElementById('paginationControls');
    const pageInfo = document.getElementById('pageInfo');

    if (!paginationControls || !pageInfo) {
        console.error('Pagination controls or page info element not found.');
        return;
    }

    paginationControls.innerHTML = '';
    pageInfo.textContent = ''; // Clear previous content

    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const prevButton = document.createElement('button');
    prevButton.textContent = 'Previous';
    prevButton.disabled = currentPage === 1;
    prevButton.className = currentPage === 1 ? 'disabled' : '';
    prevButton.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayJobRequests();
        }
    });
    paginationControls.appendChild(prevButton);

    // Page number buttons
    for (let i = 1; i <= totalPages; i++) {
        const button = document.createElement('button');
        button.textContent = i;
        button.className = i === currentPage ? 'active' : '';
        button.addEventListener('click', () => {
            currentPage = i;
            displayJobRequests();
        });
        paginationControls.appendChild(button);
    }

    // Next button
    const nextButton = document.createElement('button');
    nextButton.textContent = 'Next';
    nextButton.disabled = currentPage === totalPages;
    nextButton.className = currentPage === totalPages ? 'disabled' : '';
    nextButton.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            displayJobRequests();
        }
    });
    paginationControls.appendChild(nextButton);

    // Update page info
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
}

function displayJobRequests() {
    const jobRequestBody = document.getElementById('jobRequestBody');
    if (!jobRequestBody) {
        console.error('Job request body element not found.');
        return;
    }
    jobRequestBody.innerHTML = '';

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedJobRequests = filteredJobRequests.slice(startIndex, endIndex);

    paginatedJobRequests.forEach(request => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${request.ename}</td>
            <td>${request.designation}</td>
            <td>${request.skills}</td>
            <td>${request.experience}</td>
            <td>${request.job_description_text}</td>
            <td>
                ${request.job_description_file ? `<a href="data:application/pdf;base64,${btoa(String.fromCharCode(...new Uint8Array(request.job_description_file.data)))}" download="job_description.pdf">Download</a>` : 'No file'}
            </td>
            <td>${request.status}</td>
            <td>
                <button onclick="displayCandidatesInPopup('${request.request_id}')">View</button> <!-- Pass request.id -->
            </td>
        `;
        jobRequestBody.appendChild(row);
    });

    renderPagination(filteredJobRequests.length);
}


let displayedCandidateIds = new Set(); // Use Set to store unique candidate IDs

async function displayCandidatesInPopup(requestId) {
    currentRequestId = requestId; // Set current request ID

    try {
        const response = await fetch(`http://localhost:3000/requested_candidates/details/${requestId}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch candidate details for request ${requestId}`);
        }

        const candidateData = await response.json();

        // Clear previous content
        const candidateBody = document.getElementById('candidateBody');
        candidateBody.innerHTML = '';

        // Ensure candidateData is always treated as an array
        if (Array.isArray(candidateData)) {
            if (candidateData.length === 0) {
                console.log(`No candidates found for request ID ${requestId}`);
            } else {
                candidateData.forEach(candidateDetails => {
                    // Create new row with candidate details
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${candidateDetails.candidate_name}</td>
                        <td>${candidateDetails.candidate_email}</td>
                        <td>${candidateDetails.mobile_no}</td>
                        <td>${candidateDetails.experience}</td>
                        <td>${candidateDetails.job_portal}</td>
                        <td>${candidateDetails.refered_by}</td>
                        <td>
                            <a href="#" onclick="async function() {
                                try {
                                    const response = await fetch('http://localhost:3000/candidates/${candidateDetails.candidate_id}/resume');
                                    if (!response.ok) {
                                        throw new Error('Failed to fetch resume');
                                    }
                                    const blob = await response.blob();
                                    const url = URL.createObjectURL(blob);
                                    
                                    const newTab = window.open(url, '_blank');
                                    if (!newTab) {
                                        throw new Error('Failed to open PDF in a new tab');
                                    }
                                } catch (error) {
                                    console.error('Error viewing resume:', error);
                                    alert('Failed to view resume. Please try again later.');
                                }
                            }()">View Resume</a>
                        </td>
                    `;
                    candidateBody.appendChild(row);

                    // Add candidate ID to displayed set
                    displayedCandidateIds.add(candidateDetails.candidate_id);
                });
            }
        } else {
            console.error('Invalid data format received from server:', candidateData);
            alert('Failed to fetch candidate details. Please try again later.');
        }

        openPopup(); // Open the popup to display candidate details
    } catch (error) {
        console.error('Error fetching candidate details:', error);
        alert('Failed to fetch candidate details. Please try again later.');
    }
}

        
async function viewResume(candidateId) {
    try {
        const response = await fetch(`http://localhost:3000/candidates/${candidateId}/resume`);
        if (!response.ok) {
            throw new Error(`Failed to fetch resume: ${response.status} ${response.statusText}`);
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const newTab = window.open(url, '_blank');
        if (!newTab) {
            throw new Error('Failed to open PDF in a new tab. Please check your browser settings.');
        }
    } catch (error) {
        console.error('Error viewing resume:', error);
        alert('Failed to view resume. Please try again later.');
    }
}

function openPopup() {
    const popupContainer = document.getElementById('popupContainer');
    if (popupContainer) {
        popupContainer.style.display = 'flex';
    } else {
        console.error('Popup container element not found.');
    }
}

function closePopup() {
    const popupContainer = document.getElementById('popupContainer');
    if (popupContainer) {
        popupContainer.style.display = 'none';
    } else {
        console.error('Popup container element not found.');
    }
}

function applySearch() {
    const filterValue = document.getElementById('searchInput').value.trim().toLowerCase();

    filteredJobRequests = jobRequests.filter(request => {
        return Object.values(request).some(fieldValue => {
            if (typeof fieldValue === 'string') {
                return fieldValue.toLowerCase().includes(filterValue);
            } else if (typeof fieldValue === 'number') {
                return fieldValue.toString().includes(filterValue);
            } else {
                return false;
            }
        });
    });

    currentPage = 1;
    displayJobRequests();
}

function refreshJobRequests() {
    document.getElementById('searchInput').value = ''; // Clear search input
    filteredJobRequests = jobRequests; // Reset filtered job requests to all job requests
    currentPage = 1; // Reset pagination to first page
    displayJobRequests(); // Redisplay all job requests
    closePopup(); // Ensure the popup is hidden when refreshing
}
