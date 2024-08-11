  // Global Variables
  let jobRequests = [];
  let filteredJobRequests = []; // Array to hold filtered job requests
  const itemsPerPage = 10;
  let currentPage = 1;
  let currentRequestId = null; // Track current request ID for displaying candidates
  const searchColumn = 'ename'; // Ensure this matches the property in your data

  // Initialize the page
  document.addEventListener('DOMContentLoaded', function() {
      fetchJobRequests();
      setupPagination();
      closePopup(); // Ensure the popup is hidden when the page loads

      // Bind applySearch() function to search input
      document.getElementById('searchInput').addEventListener('input', applySearch);
  });

  // Fetch job requests from the server and verify data structure
  async function fetchJobRequests() {
      try {
          const response = await fetch("http://localhost:3000/requests");
          if (!response.ok) {
              throw new Error(`Failed to fetch job requests: ${response.status} ${response.statusText}`);
          }
          const data = await response.json();
          jobRequests = data;
          filteredJobRequests = jobRequests; // Initialize filtered job requests with all job requests
          displayJobRequests(); // Display job requests initially
      } catch (error) {
          console.error('Error fetching job requests:', error);
          alert('Failed to fetch job requests. Please try again later.');
      }
  }

  // Set up pagination controls
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

  // Render pagination controls
  function renderPagination(totalItems) {
      const paginationControls = document.getElementById('paginationControls');
      const pageInfo = document.getElementById('pageInfo');

      if (!paginationControls || !pageInfo) {
          console.error('Pagination controls or page info element not found.');
          return; // Exit function if elements are not found
      }

      const totalPages = Math.ceil(totalItems / itemsPerPage);

      // Update page info
      pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  }

  // Display job requests on the page
function displayJobRequests() {
    const jobRequestBody = document.getElementById('jobRequestBody');
    if (!jobRequestBody) {
        console.error('Job request body element not found.');
        return;
    }
    jobRequestBody.innerHTML = '';

    // Check if there are any job requests
    if (filteredJobRequests.length === 0) {
        const noRequestsRow = document.createElement('tr');
        noRequestsRow.innerHTML = `<td colspan="8">No new requests</td>`; // Adjust colspan if necessary
        jobRequestBody.appendChild(noRequestsRow);
        renderPagination(0); // No pagination needed if there are no requests
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedJobRequests = filteredJobRequests.slice(startIndex, endIndex);

    paginatedJobRequests.forEach(request => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${request.ename || 'N/A'}</td>
            <td>${request.designation || 'N/A'}</td>
            <td>${request.skills || 'N/A'}</td>
            <td>${request.experience || 'N/A'}</td>
            <td>${request.job_description_text || 'N/A'}</td>
            <td>${request.job_description_file ? `<a href="data:application/pdf;base64,${btoa(request.job_description_file)}" download="job_description.pdf">Download</a>` : 'No file'}</td>
            <td>${request.status || 'N/A'}</td>
            <td>
                <button onclick="displayCandidatesInPopup('${request.request_id}')">View</button>
            </td>
        `;
        jobRequestBody.appendChild(row);
    });

    renderPagination(filteredJobRequests.length);
}
async function displayCandidatesInPopup(requestId) {
    currentRequestId = requestId; // Set current request ID

    try {
        const response = await fetch(`http://localhost:3000/candidates_for_request/${requestId}`);

        if (!response.ok) {
            throw new Error(`Failed to fetch candidate details for request ${requestId}`);
        }

        const candidateData = await response.json();

        const candidateBody = document.getElementById('candidateBody');
        if (!candidateBody) {
            console.error('Candidate body element not found.');
            return;
        }
        candidateBody.innerHTML = ''; // Clear previous content

        if (Array.isArray(candidateData)) {
            if (candidateData.length === 0) {
                const messageRow = document.createElement('tr');
                messageRow.innerHTML = `<td colspan="9">No candidates added yet</td>`;
                candidateBody.appendChild(messageRow);
            } else {
                candidateData.forEach(candidateDetails => {
                    const row = document.createElement('tr');
                    const storedStatus = localStorage.getItem(`selectedStatus_${candidateDetails.candidate_id}`);

                    // Determine if feedback button should be enabled
                    const feedbackButtonDisabled = storedStatus !== 'selected';

                    row.innerHTML = `
                        <td>${candidateDetails.candidate_name}</td>
                        <td>${candidateDetails.candidate_email}</td>
                        <td>${candidateDetails.mobile_no}</td>
                        <td>${candidateDetails.experience}</td>
                        <td>${candidateDetails.job_portal}</td>
                        <td>${candidateDetails.refered_by}</td>
                        <td>${candidateDetails.preferred_location}</td>
                        <td>${candidateDetails.expected_salary}</td>
                        <td>${candidateDetails.notice_period}</td>

                        <td>
                            <a href="#" onclick="viewResume('${candidateDetails.candidate_id}')">Resume</a>
                        </td>
                        <td>
                            <select onchange="updateCandidateStatus('${candidateDetails.candidate_id}', '${requestId}', this)">
                                <option value="pending" ${storedStatus === 'pending' ? 'selected' : ''}>Pending</option>
                                <option value="selected" ${storedStatus === 'selected' ? 'selected' : ''}>Select</option>
                                <option value="rejected" ${storedStatus === 'rejected' ? 'selected' : ''}>Reject</option>
                            </select>
                        </td>
                        <td>
                            <button class="feedback-btn" onclick="addFeedback('${candidateDetails.candidate_id}', '${requestId}')" ${feedbackButtonDisabled ? 'disabled' : ''}>Add Feedback</button>
                        </td>
                    `;

                    candidateBody.appendChild(row);
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



async function updateCandidateStatus(candidateId, requestId, selectElement) {
    const selectedStatus = selectElement.value;

    try {
        const response = await fetch(`http://localhost:3000/candidates/${candidateId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json', 
            },
            body: JSON.stringify({ status: selectedStatus, requestId: requestId }),
        });

        if (!response.ok) {
            throw new Error(`Failed to update status for candidate ${candidateId}: ${response.status} ${response.statusText}`);
        }

        localStorage.setItem(`selectedStatus_${candidateId}`, selectedStatus);

        // Find the feedback button and update its disabled state
        const candidateBody = document.getElementById('candidateBody');
        if (candidateBody) {
            const feedbackButton = candidateBody.querySelector(`button[onclick="addFeedback('${candidateId}', '${requestId}')"]`);
            if (feedbackButton) {
                feedbackButton.disabled = selectedStatus !== 'selected';
            }
        }

        console.log(`Candidate ${candidateId} status updated to ${selectedStatus}`);
        alert(`Candidate status updated successfully`);
    } catch (error) {
        console.error(`Error updating status for candidate ${candidateId}:`, error);
        alert(`Failed to update status for candidate ${candidateId}. Please try again later.`);
    }
}

  // View candidate resume
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

  function addFeedback(candidateId, requestId) {
    // Redirect to feedback.html with candidateId and requestId as URL parameters
    window.location.href = `feedback.html?candidateId=${candidateId}&requestId=${requestId}`;
}


  // Search job requests based on input value
  function applySearch() {
      const searchInput = document.getElementById('searchInput').value.toLowerCase().trim();

      if (searchInput === '') {
          filteredJobRequests = jobRequests; // Reset to full list if search input is empty
      } else {
          filteredJobRequests = jobRequests.filter(request => {
              const columnValue = request[searchColumn];
              return columnValue && columnValue.toLowerCase().includes(searchInput);
          });
      }

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

  // Placeholder function for closing popup
  function closePopup() {
      document.getElementById('popupContainer').style.display = 'none';
  }

  // Placeholder function for opening popup
  function openPopup() {
      document.getElementById('popupContainer').style.display = 'block';
  }