let jobRequests = [];
let filteredJobRequests = []; // Array to hold filtered job requests
const itemsPerPage = 4;
let currentPage = 1;
let currentRequestId = null; // Track current request ID for displaying candidates
let searchColumn = 'ename'; // Default search column

document.addEventListener('DOMContentLoaded', function() {
    fetchJobRequests();
    setupPagination();
    hidePopup(); // Ensure the popup is hidden when the page loads
});

async function fetchJobRequests() {
    try {
        const response = await fetch("http://localhost:3001/requests");
        if (!response.ok) {
            throw new Error(`Failed to fetch job requests: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        jobRequests = data;
        filteredJobRequests = jobRequests; // Initialize filtered job requests with all job requests
        displayJobRequests();
    } catch (error) {
        console.error('Error fetching job requests:', error);
    }
}

function setupPagination() {
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');

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
}

function renderPagination(totalItems) {
    const paginationControls = document.getElementById('paginationControls');
    paginationControls.innerHTML = '';

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
    const pageInfo = document.getElementById('pageInfo');
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
}

function displayJobRequests() {
    const jobRequestBody = document.getElementById('jobRequestBody');
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
            <td>
                <button onclick="showCandidates('${request.request_id}')">Add</button> <!-- Pass request.id -->
            </td>
            
            <td>
                <select data-request-id="${request.request_id}" onchange="handleStatusChange('${request.request_id}', this.value)">
                    <option value="pending" ${request.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="inprogress" ${request.status === 'inprogress' ? 'selected' : ''}>InProgress</option>
                    <option value="completed" ${request.status === 'completed' ? 'selected' : ''}>Completed</option>
                </select>
                </td>
            </td>
            
        `;
        jobRequestBody.appendChild(row);
    });

    renderPagination(filteredJobRequests.length);
}
m
function handleStatusChange(requestId, newStatus) {
    updateJobRequestStatus(requestId, newStatus);
}

async function updateJobRequestStatus(requestId, newStatus) {
    try {
        const response = await fetch(`http://localhost:3001/requests/${requestId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus })
        });

        if (!response.ok) {
            throw new Error(`Failed to update job request status: ${response.status} ${response.statusText}`);
        }

        alert('Job request status updated successfully!');
    } catch (error) {
        console.error('Error updating job request status:', error);
        alert('Failed to update job request status. Please try again later.');
    }
}

function showCandidates(requestId) {
    currentRequestId = requestId; // Set current request ID
    const candidatesUrl = `http://localhost:3005/candidates?request_id=${requestId}`;

    fetch(candidatesUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch candidates for request ${requestId}`);
            }
            return response.json();
        })
        .then(data => {
            displayCandidatesInPopup(data, requestId); // Pass requestId to display candidates
        })
        .catch(error => {
            console.error('Error fetching candidates:', error);
            alert('Failed to fetch candidates. Please try again later.');
        });
}

function displayCandidatesInPopup(candidates, requestId) {
    const candidateBody = document.getElementById('candidateBody');
    candidateBody.innerHTML = '';

    candidates.forEach(candidate => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${candidate.candidate_name}</td>
            <td>${candidate.candidate_email}</td>
            <td>${candidate.mobile_no}</td>
            <td>${candidate.experience}</td>
            <td>${candidate.job_portal}</td>
            <td>${candidate.refered_by}</td>
            <td>
                <a href="#" onclick="viewResume('${candidate.candidate_id}')">View Resume</a>
            </td>
            <td>
                <button onclick="addCandidateToRequest('${candidate.candidate_id}', '${requestId}')">+</button> <!-- Pass requestId -->
            </td>`;
        candidateBody.appendChild(row);
    });

    openPopup(); 
}

async function addCandidateToRequest(candidateId, requestId) {
    try {
        const requestBody = {
            candidate_id: candidateId,
            request_id: requestId
        };

        const response = await fetch('http://localhost:3003/requested_candidates', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`Failed to add candidate to request: ${response.status} ${response.statusText}`);
        }

        alert('Candidate added to request successfully!');
        closePopup();
    } catch (error) {
        console.error('Error adding candidate to request:', error);
        alert('Failed to add candidate to request. Please try again later.');
    }
}
function openPopup() {
    const popupContainer = document.getElementById('popupContainer');
    popupContainer.style.display = 'flex';
}

function closePopup() {
    const popupContainer = document.getElementById('popupContainer');
    popupContainer.style.display = 'none';
}

function applySearch() {
    const filterValue = document.getElementById('searchInput').value.trim().toLowerCase();

    filteredJobRequests = jobRequests.filter(request => {
        for (const key in request) {
            if (Object.prototype.hasOwnProperty.call(request, key)) {
                const fieldValue = String(request[key]).toLowerCase();
                if (fieldValue.includes(filterValue)) {
                    return true;
                }
            }
        }
        return false;
    });

    currentPage = 1;
    displayJobRequests();
}
function refreshJobRequests() {
    document.getElementById('searchInput').value = ''; // Clear search input
    filteredJobRequests = jobRequests; // Reset filtered job requests to all job requests
    currentPage = 1; // Reset pagination to first page
    displayJobRequests(); // Redisplay all job requests
    hidePopup(); // Ensure the popup is hidden when refreshing
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