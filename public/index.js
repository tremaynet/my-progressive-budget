let transactions = [];
let myChart;

fetch("/api/transaction")
  .then(response => {
    return response.json();
  })
  .then(data => {
    // save db data on global variable
    let newTransactions = data;
    if (localStorage.getItem('transactions')) {
      oldTransactions = JSON.parse(localStorage.getItem('transactions'));
      oldTransactions.filter(transaction => !transaction._id).forEach(transaction => {
        newTransactions.unshift(transaction);
      })
    }
    transactions = newTransactions;
    localStorage.setItem('transactions', JSON.stringify(newTransactions));
    sendTempTransactions();
    populate();
  })
  .catch(err => {
    transactions = JSON.parse(localStorage.getItem('transactions'))
    populate();
  });

function populate() {
  populateTotal();
  populateTable();
  populateChart();
}
function populateTotal() {
  // reduce transaction amounts to a single total value
  let total = transactions.reduce((total, t) => {
    return total + parseInt(t.value);
  }, 0);

  let totalEl = document.querySelector("#total");
  totalEl.textContent = total;
}

function populateTable() {
  let tbody = document.querySelector("#tbody");
  tbody.innerHTML = "";

  transactions.forEach(transaction => {
    // create and populate a table row
    let tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${transaction.name}</td>
      <td>${transaction.value}</td>
    `;

    tbody.appendChild(tr);
  });
}

function populateChart() {
  // copy array and reverse it
  let reversed = transactions.slice().reverse();
  let sum = 0;

  // create date labels for chart
  let labels = reversed.map(t => {
    let date = new Date(t.date);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  });

  // create incremental values for chart
  let data = reversed.map(t => {
    sum += parseInt(t.value);
    return sum;
  });

  // remove old chart if it exists
  if (myChart) {
    myChart.destroy();
  }

  let ctx = document.getElementById("myChart").getContext("2d");

  myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: "Total Over Time",
        fill: true,
        backgroundColor: "#6666ff",
        data
      }]
    }
  });
}

function sendTransaction(isAdding) {
  let nameEl = document.querySelector("#t-name");
  let amountEl = document.querySelector("#t-amount");
  let errorEl = document.querySelector(".form .error");

  // validate form
  if (nameEl.value === "" || amountEl.value === "") {
    errorEl.textContent = "Missing Information";
    return;
  }
  else {
    errorEl.textContent = "";
  }

  // create record
  let transaction = {
    name: nameEl.value,
    value: amountEl.value,
    date: new Date().toISOString()
  };

  // if subtracting funds, convert amount to negative number
  if (!isAdding) {
    transaction.value *= -1;
  }


  // also send to server
  fetch("/api/transaction", {
    method: "POST",
    body: JSON.stringify(transaction),
    headers: {
      Accept: "application/json, text/plain, */*",
      "Content-Type": "application/json"
    }
  })
    .then(response => {
      return response.json();
    })
    .then(data => {
      addTransaction(data, nameEl, amountEl)
      sendTempTransactions();
    })
    .catch(err => {
      addTransaction({ ...transaction, tempId: new Date().getTime() }, nameEl, amountEl)
    });
}

const sendTempTransactions = () => {
  for (let i = 0; i < transactions.length; i++) {
    if (!transactions[i]._id) {
      fetch("/api/transaction", {
        method: "POST",
        body: JSON.stringify(transactions[i]),
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json"
        }
      })
        .then(response => {
          return response.json();
        })
        .then(data => {
          transactions[i] = data;
          localStorage.setItem('transactions', JSON.stringify(transactions));
        })
    }
  }
}
const addTransaction = (data, nameEl, amountEl) => {
  transactions.unshift(data);
  // clear form
  populate();
  nameEl.value = "";
  amountEl.value = "";

  localStorage.setItem('transactions', JSON.stringify(transactions));
}
document.querySelector("#add-btn").onclick = function () {
  sendTransaction(true);
};

document.querySelector("#sub-btn").onclick = function () {
  sendTransaction(false);
};
