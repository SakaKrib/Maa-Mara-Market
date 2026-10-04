//active class intergration
const navigationLink = document.querySelectorAll('.navigate-bar li');

function activeLink(){
    navigationLink.forEach((item) => {
        item.classList.remove('hovered');
    });
    this.classList.add('hovered')
}

navigationLink.forEach(item => item.addEventListener('mouseover', activeLink));

//toggle bar manipulation
const main = document.querySelector('.main-dashboard');
const toggleB = document.querySelector('.toggle');
const navigation = document.querySelector('.navigate-bar'),
      wrapNav = document.querySelector('.nav-container'),
      headerTop = document.querySelector('.header-top');

toggleB.onclick = function (){
    navigation.classList.toggle('active');
    main.classList.toggle('active');
    wrapNav.classList.remove('active');
    headerTop.classList.toggle('active');
}

//close the navigtion menu on the side
const closeMenu = document.querySelector('.close').addEventListener('click', function() {
  navigation.classList.toggle('active');
  wrapNav.classList.toggle('active');
  main.classList.toggle('active');
  headerTop.classList.remove('active');

  
});


// hide or show search icon and input
const SearchInput = document.querySelector('form.search input'),
      searchBtn = document.querySelector('.press'),
      searchIcon = document.querySelector('.search-icon');


      searchBtn.addEventListener('click', function () {
         SearchInput.classList.toggle('active');
         searchIcon.classList.toggle('active');
         searchBtn.classList.toggle('active');
      });


 

//DARK MODE LIGT MODE INTERGRATION
const themeBtn = document.querySelector('.theme-button').addEventListener('click', function() {
    document.body.classList.add('dark-theme');

    document.querySelector('li:first-child').classList.toggle('active');
    const HeaderTopIcon = document.querySelectorAll('.iconBox');
    console.log(HeaderTopIcon)
    HeaderTopIcon.forEach((icon) => {
      icon.classList.toggle('active');
    })

})


     //close or open content within anchor tags
     const openClose = document.querySelector('.open'),
           content = document.querySelector('.contents'),
           Lane = document.querySelector('.lane');
           console.log(content);

           openClose.addEventListener('click', function(){
              content.classList.toggle('active');
              Lane.classList.toggle('active');
              openClose.classList.toggle('active');
            })

   //scripts for chart intergration
   const mainChart = document.querySelector("#chart-main").getContext('2d');

   // Create a new chart instance
   new Chart(mainChart, {
     type: 'line',
     data: {
       labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
       datasets: [
         {
           label: 'BTC',
           data: [255510, 335525, 466636, 477883, 588899, 598939, 466394, 388299, 599493, 588499, 699490, 788689],
           borderColor: 'red',
           borderWidth: 2
         },
         {
           label: 'EHT',
           data: [355510, 385525, 566636, 497883, 588899, 668939, 696394, 708299, 799493, 888499, 899490, 888689],
           borderColor: 'blue',
           borderWidth: 2
         }
       ]
     },
     options: {
       responsive: true
     }
   });


  //chart intergration for admin accounts
const ctx2 = document.getElementById('myChart');

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

  