<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Excel Data Export</title>
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
</head>
<body>
    <div class="container">
        <h1>Excel Data Export</h1>

        <form id="exportForm">
            <div>
                <label for="state">Filter by State (optional):</label>
                <select id="state" name="state">
                    <option value="">All States</option>
                </select>
            </div>

            <div>
                <label for="format">Export Format:</label>
                <select id="format" name="format" required>
                    <option value="csv">CSV</option>
                    <option value="xlsx">Excel (XLSX)</option>
                </select>
            </div>

            <button type="submit">Start Export</button>
        </form>

        <div id="status" style="display: none;">
            <h3>Export Status</h3>
            <p id="statusMessage">Processing...</p>
            <div id="downloadLink" style="display: none;">
                <a href="#" id="downloadButton">Download File</a>
            </div>
        </div>
    </div>

    <script>
        // Set up CSRF token for axios
        axios.defaults.headers.common['X-CSRF-TOKEN'] = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

        // Load states on page load
        document.addEventListener('DOMContentLoaded', function() {
            loadStates();
        });

        // Load available states
        function loadStates() {
            axios.get('/excel-data/states')
                .then(response => {
                    const stateSelect = document.getElementById('state');
                    response.data.forEach(state => {
                        const option = document.createElement('option');
                        option.value = state;
                        option.textContent = state;
                        stateSelect.appendChild(option);
                    });
                })
                .catch(error => {
                    console.error('Error loading states:', error);
                });
        }

        // Handle form submission
        document.getElementById('exportForm').addEventListener('submit', function(e) {
            e.preventDefault();

            const formData = new FormData(this);
            const data = Object.fromEntries(formData);

            axios.post('/excel-data/export', data)
                .then(response => {
                    document.getElementById('status').style.display = 'block';
                    checkStatus(response.data.filename);
                })
                .catch(error => {
                    alert('Error starting export: ' + error.response.data.message);
                });
        });

        // Check export status
        function checkStatus(filename) {
            axios.get('/excel-data/status/' + filename)
                .then(response => {
                    if (response.data.status === 'completed') {
                        document.getElementById('statusMessage').textContent = 'Export completed!';
                        document.getElementById('downloadLink').style.display = 'block';
                        document.getElementById('downloadButton').href = response.data.download_url;
                    } else {
                        document.getElementById('statusMessage').textContent = 'Processing...';
                        setTimeout(() => checkStatus(filename), 5000); // Check again in 5 seconds
                    }
                })
                .catch(error => {
                    document.getElementById('statusMessage').textContent = 'Error checking status';
                });
        }
    </script>
</body>
</html>
