const ctx = document.getElementById('myChart_1');

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
      backgroundColor: [
        "rgba(54, 162, 215, 1)",
        "rgba(255, 99, 132, 1)",
        "rgba(255, 206, 215, 1)",
      ],
      datasets: [{
        label: '# of Votes',
        data: [12, 19, 3, 5, 2, 3],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
        },
      },
  );

  //chart two
  const ctx2 = document.getElementById('myChart_2');

  new Chart(ctx2, {
    type: 'polarArea',
    data: {
      labels: ['Red', 'Blue', 'Yellow', 'Green', 'Purple', 'Orange'],
      backgroundColor: [
        "red",
        "blue",
        "orange",
      ],
      datasets: [{
        label: '# of Votes',
        data: [12, 19, 3, 5, 2, 3],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
        },
      },
  );

  // dropdwown for profile cofig
  document.addEventListener('DOMContentLoaded', function () {
                    var department = document.querySelector('.user-img');
                    var dropdown = document.querySelector('.profile-menu');
        
                    department.addEventListener('click', function () {
                        dropdown.classList.toggle('show');
                    });
        
                    // Close the dropdown if clicking outside of it
                    document.addEventListener('click', function (event) {
                        if (!department.contains(event.target) && !dropdown.contains(event.target)) {
                            dropdown.classList.remove('show');
                        }
                    });
                });