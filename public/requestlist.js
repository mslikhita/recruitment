let jobRequests = [];
let filteredJobRequests = []; // Array to hold filtered job requests
const itemsPerPage = 10;
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
    if (!paginationControls) {
        console.error('Element with ID "paginationControls" not found.');
        return;
    }

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
    if (pageInfo) {
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    } else {
        console.error('Element with ID "pageInfo" not found.');
    }
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
                <button onclick="viewSelectedCandidates('${request.request_id}')">View</button>
            </td>
               <td>
                <button onclick="viewRejectedCandidates('${request.request_id}')">View</button>
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

function handleStatusChange(requestId, newStatus) {
    updateJobRequestStatus(requestId, newStatus);
}

async function updateJobRequestStatus(requestId, newStatus) {
    try {
        const response = await fetch(`http://localhost:3000/requests/${requestId}/status`, {
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
    const candidatesUrl = `http://localhost:3000/candidates?request_id=${requestId}`;

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
            <td>${candidate.preferred_location}</td>
            <td>${candidate.expected_salary}</td>
            <td>${candidate.notice_period}</td>
              <td>
                <a href="#" onclick="viewResume('${candidate.candidate_id}')"> Resume</a>
            </td>
            <td>
                <input type="checkbox" id="candidate_${candidate.candidate_id}" data-candidate-id="${candidate.candidate_id}" data-request-id="${requestId}">
            </td>`
            ;
        candidateBody.appendChild(row);
    });

    // Add button to add selected candidates
    const addButton = document.createElement('button');
    addButton.textContent = 'Add Candidates';
    addButton.addEventListener('click', () => {
        const selectedCandidates = [];
        candidates.forEach(candidate => {
            const checkbox = document.getElementById(`candidate_${candidate.candidate_id}`);
            if (checkbox.checked) {
                const requestID = checkbox.getAttribute('data-request-id');
                selectedCandidates.push(candidate.candidate_id);
            }
        });

        if (selectedCandidates.length > 0) {
            addCandidatesToRequest(selectedCandidates, requestId);
        } else {
            alert('Please select at least one candidate to add.');
        }
    });

    candidateBody.appendChild(addButton);
    openPopup();
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

async function addCandidatesToRequest(candidateIds, requestId) {
    try {
        if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
            throw new Error('No candidates provided.');
        }

        const requestBody = {
            candidate_ids: candidateIds,
            request_id: requestId
        };

        const response = await fetch('http://localhost:3000/add_candidates_to_request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`Failed to process candidates: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log(result); // Log the response details

        alert(`Candidates added successfully! Email sent successfuly`  );
        closePopup(); // Close the popup or update the UI

    } catch (error) {
        console.error('Error processing candidates:', error);
        alert('Failed to process candidates. Please try again later.');
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

function viewSelectedCandidates(requestId) {
    const endpoint = `http://localhost:3000/selected_candidates_for_request/${requestId}`;

    fetch(endpoint)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to fetch selected candidates for request ${requestId}`);
            }
            return response.json();
        })
        .then(data => {
            displaySelectedCandidates(data, requestId); // Pass the data to display function
        })
        .catch(error => {
            console.error('Error fetching selected candidates:', error);
            alert('Failed to fetch selected candidates. Please try again later.');
        });
}


function displaySelectedCandidates(candidates, requestId) {
    const selectedCandidatesBody = document.getElementById('selectedCandidatesBody');

    if (!selectedCandidatesBody) {
        console.error('Error: Element with ID "selectedCandidatesBody" not found.');
        return;
    }

    selectedCandidatesBody.innerHTML = '';

    candidates.forEach(candidate => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${candidate.candidate_name}</td>
            <td>${candidate.candidate_email}</td>
            <td>${candidate.mobile_no}</td>
            <td>${candidate.experience}</td>
            <td>${candidate.job_portal}</td>
            <td>${candidate.refered_by}</td>
            <td>${candidate.preferred_location}</td>
            <td>${candidate.expected_salary}</td>
            <td>${candidate.notice_period}</td>
            <td>
                <a href="#" onclick="viewResume('${candidate.candidate_id}')">Resume</a>
            </td>
            <td>
                <button onclick="scheduleInterview('${requestId}', '${candidate.candidate_id}')">Schedule Interview</button>
            </td>`;
        selectedCandidatesBody.appendChild(row);
    });

    openSelectedCandidatesPopup(); // Open the popup after displaying candidates
}

function scheduleInterview(requestId, candidateId) {
    // First, post the candidate to the server
    fetch('http://localhost:3000/requested_candidates', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ request_id: requestId, candidate_id: candidateId })
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            // Successfully added the candidate to the requested_candidates table
            // Redirect to schedule.html with query parameters
            window.location.href = `schedule.html?requestId=${encodeURIComponent(requestId)}&candidateId=${encodeURIComponent(candidateId)}`;
        } else {
            // Handle error case
            console.error('Failed to add candidate to requested_candidates:', data.error);
        }
    })
    .catch(error => {
        // Handle network or server error
        console.error('Error:', error);
    });
}

function openSelectedCandidatesPopup() {
    const selectedCandidatesPopup = document.getElementById('selectedCandidatesPopup');

    if (selectedCandidatesPopup) {
        selectedCandidatesPopup.style.display = 'flex';
        closePopup(); // Close the main popup after opening the selected candidates popup
    } else {
        console.error('Error: Element with ID "selectedCandidatesPopup" not found.');
    }
}


// Search job requests based on input value
function applySearch() {
    const searchInput = document.getElementById('searchInput').value.toLowerCase().trim();
    console.log('Search Input:', searchInput);

    if (searchInput === '') {
        filteredJobRequests = jobRequests; // Reset to full list if search input is empty
    } else {
        filteredJobRequests = jobRequests.filter(request => {
            const columnValue = request[searchColumn];
            return columnValue && columnValue.toLowerCase().includes(searchInput);
        });
    }

    console.log('Filtered Requests:', filteredJobRequests);

    currentPage = 1; // Reset to the first page
    displayJobRequests(); // Display the filtered job requests
}

// Refresh job requests to reset filter and pagination
function refreshJobRequests() {
    document.getElementById('searchInput').value = ''; // Clear search input
    filteredJobRequests = jobRequests; // Reset to full list
    currentPage = 1; // Reset to the first page
    displayJobRequests(); // Display the job requests
}

function closeSelectedCandidatesPopup() {
    const selectedCandidatesPopup = document.getElementById('selectedCandidatesPopup');
    
    if (selectedCandidatesPopup) {
        selectedCandidatesPopup.style.display = 'none';
    } else {
        console.error('Error: Element with ID "selectedCandidatesPopup" not found.');
    }
}



function hidePopup() {
    const popupContainer = document.getElementById('popupContainer');
    popupContainer.style.display = 'none';
}
