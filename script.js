document.addEventListener('DOMContentLoaded', function() {
    const tableBody = document.querySelector('#dataTable tbody');
    const predictedNumberElement = document.getElementById('predictedNumber');
    const predictedPremiumElement = document.getElementById('predictedPremium');
    const timerElement = document.getElementById('timeRemaining');
    const historyTableBody = document.querySelector('#predictionHistoryTable tbody');
    const ctx = document.getElementById('predictionChart').getContext('2d');
    let chart;
    let predictionHistory = JSON.parse(localStorage.getItem('predictionHistory')) || [];
    let lastPrediction = JSON.parse(localStorage.getItem('lastPrediction'));

    let currentPage = 0;
    const itemsPerPage = 10;

    const fetchNoAverageEmerdList = () => {
        const requestData = {
            pageSize: 10,
            pageNo: 1,
            typeId: 1,
            language: 0,
            random: "ded40537a2ce416e96c00e5218f6859a",
            signature: "69306982EEEB19FA940D72EC93C62552",
            timestamp: 1721383261
        };

        return fetch('https://api.bdg88zf.com/api/webapi/GetNoaverageEmerdList', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json;charset=UTF-8',
                'Accept': 'application/json, text/plain, */*'
            },
            body: JSON.stringify(requestData)
        })
        .then(response => response.json())
        .catch(error => console.error('Error fetching no average EMERD list data:', error));
    };

    const fetchGameIssue = () => {
        const requestData = {
            typeId: 1,
            language: 0,
            random: "f8dcb5c527814db68800e3946a2b60e8",
            signature: "08CF7FF3339ED58D4743F4B650FCBEA9",
            timestamp: 1721383261
        };

        return fetch('https://api.bdg88zf.com/api/webapi/GetGameIssue', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json;charset=UTF-8',
                'Accept': 'application/json, text/plain, */*'
            },
            body: JSON.stringify(requestData)
        })
        .then(response => response.json())
        .catch(error => console.error('Error fetching game issue:', error));
    };

    const categorizeNumber = (number) => {
        if (number >= 0 && number <= 4) {
            return 'Small';
        } else if (number >= 5 && number <= 9) {
            return 'Big';
        } else {
            return 'Unknown';
        }
    };

    const predictNextNumber = (list) => {
        if (list.length < 2) {
            return { number: 'N/A', category: 'N/A', premium: 'N/A' };
        }

        const recentNumbers = list.slice(0, 5).map(item => Number(item.number));
        if (recentNumbers.length < 2) return { number: 'N/A', category: 'N/A', premium: 'N/A' };

        const sum = recentNumbers.reduce((a, b) => a + b, 0);
        const average = sum / recentNumbers.length;
        const trend = recentNumbers.length >= 2 ? recentNumbers[0] - recentNumbers[1] : 0;
        const predictedNumber = Math.round(average + trend);
        const clampedNumber = Math.max(0, Math.min(9, predictedNumber));
        const predictedCategory = categorizeNumber(clampedNumber);

        return {
            number: clampedNumber,
            category: predictedCategory,
            premium: list[0].premium
        };
    };

    const updateDataAndPrediction = () => {
        fetchNoAverageEmerdList()
            .then(data => {
                const list = data.data.list;
                tableBody.innerHTML = ''; // Clear previous data
                list.forEach(item => {
                    const numberCategory = categorizeNumber(Number(item.number));
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${item.issueNumber}</td>
                        <td>${item.number} (${numberCategory})</td>
                        <td>${item.colour}</td>
                        <td>${item.premium}</td>
                    `;
                    tableBody.appendChild(row);
                });

                const prediction = predictNextNumber(list);
                predictedNumberElement.textContent = `Predicted Number: ${prediction.number} (${prediction.category})`;
                predictedPremiumElement.textContent = `Predicted Premium: ${prediction.premium}`;

                const latestIssue = list[0].issueNumber;
                const latestPrediction = prediction.number;
                const latestActual = Number(list[0].number);
                const predictedCategory = prediction.category;
                const actualCategory = categorizeNumber(latestActual);
                
                let result = 'N/A';

                if (lastPrediction) {
                    if (lastPrediction.issueNumber === latestIssue) {
                        result = (predictedCategory === actualCategory) ? 'Win' : 'Loss';
                    } else {
                        result = (lastPrediction.category === actualCategory) ? 'Win' : 'Loss';
                    }
                }

                if (lastPrediction && lastPrediction.issueNumber !== latestIssue) {
                    predictionHistory.push({
                        issueNumber: lastPrediction.issueNumber,
                        predictedNumber: lastPrediction.number,
                        actualNumber: latestActual,
                        result: result
                    });
                    localStorage.setItem('predictionHistory', JSON.stringify(predictionHistory));
                }

                lastPrediction = {
                    issueNumber: latestIssue,
                    number: latestPrediction,
                    category: predictedCategory
                };
                localStorage.setItem('lastPrediction', JSON.stringify(lastPrediction));

                updatePredictionHistoryTable();
                updateChart();
            })
            .catch(error => console.error('Error fetching no average EMERD list data:', error));
    };

    const updatePredictionHistoryTable = () => {
        historyTableBody.innerHTML = ''; // Clear previous data

        predictionHistory.sort((a, b) => b.issueNumber - a.issueNumber);

        const start = currentPage * itemsPerPage;
        const end = start + itemsPerPage;
        const paginatedHistory = predictionHistory.slice(start, end);

        paginatedHistory.forEach(entry => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${entry.issueNumber}</td>
                <td>${entry.predictedNumber}</td>
                <td>${entry.actualNumber}</td>
                <td>${entry.result}</td>
            `;
            historyTableBody.appendChild(row);
        });

        document.getElementById('prevPage').disabled = currentPage === 0;
        document.getElementById('nextPage').disabled = end >= predictionHistory.length;
    };

    const updateChart = () => {
        if (chart) {
            chart.destroy();
        }

        const labels = predictionHistory.map(entry => entry.issueNumber);
        const predictedData = predictionHistory.map(entry => entry.predictedNumber);
        const actualData = predictionHistory.map(entry => entry.actualNumber);
        const resultData = predictionHistory.map(entry => entry.result === 'Win' ? 1 : 0);

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Predicted Numbers',
                        data: predictedData,
                        borderColor: 'blue',
                        backgroundColor: 'rgba(0, 0, 255, 0.2)',
                        fill: false
                    },
                    {
                        label: 'Actual Numbers',
                        data: actualData,
                        borderColor: 'red',
                        backgroundColor: 'rgba(255, 0, 0, 0.2)',
                        fill: false
                    },
                    {
                        label: 'Prediction Result (1 = Win, 0 = Loss)',
                        data: resultData,
                        borderColor: 'green',
                        backgroundColor: 'rgba(0, 255, 0, 0.2)',
                        fill: false,
                        type: 'bar'
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(tooltipItem) {
                                if (tooltipItem.dataset.label === 'Prediction Result (1 = Win, 0 = Loss)') {
                                    return `${tooltipItem.dataset.label}: ${tooltipItem.raw === 1 ? 'Win' : 'Loss'}`;
                                }
                                return `${tooltipItem.dataset.label}: ${tooltipItem.raw}`;
                            }
                        }
                    }
                }
            }
        });
    };

    const updateTimer = () => {
        fetchGameIssue()
            .then(data => {
                const { startTime, endTime, serviceTime, intervalM } = data.data;
                const endDate = new Date(endTime);
                const intervalMs = intervalM * 60 * 1000; // Convert minutes to milliseconds
                const now = new Date();
                const remainingTimeMs = endDate - now;

                if (remainingTimeMs <= 0) {
                    timerElement.textContent = "Time Remaining: 00:00:00";
                    clearInterval(timerInterval);
                    updateDataAndPrediction(); // Fetch new data and predictions
                    timerInterval = setInterval(updateTimer, 1000); // Restart the timer
                } else {
                    const hours = String(Math.floor(remainingTimeMs / (1000 * 60 * 60))).padStart(2, '0');
                    const minutes = String(Math.floor((remainingTimeMs % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
                    const seconds = String(Math.floor((remainingTimeMs % (1000 * 60)) / 1000)).padStart(2, '0');
                    timerElement.textContent = `Time Remaining: ${hours}:${minutes}:${seconds}`;
                }
            })
            .catch(error => console.error('Error fetching game issue:', error));
    };

    // Fetch initial data and start the timer
    updateDataAndPrediction();
    let timerInterval = setInterval(updateTimer, 1000);

    // Pagination controls
    document.getElementById('prevPage').addEventListener('click', () => {
        if (currentPage > 0) {
            currentPage--;
            updatePredictionHistoryTable();
        }
    });

    document.getElementById('nextPage').addEventListener('click', () => {
        if ((currentPage + 1) * itemsPerPage < predictionHistory.length) {
            currentPage++;
            updatePredictionHistoryTable();
        }
    });

    // Load initial prediction history table
    updatePredictionHistoryTable();
});