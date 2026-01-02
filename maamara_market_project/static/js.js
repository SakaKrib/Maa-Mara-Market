// nav menu hide show

const menuBar = document.querySelector('.menu');
console.log(menuBar);
const closeBar = document.querySelector('.close');
console.log(closeBar);
const navMenu = document.querySelector('nav.colour_background');
console.log(navMenu);

navMenu.classList.add('hide');
function show(){

    navMenu.classList.toggle('show');
    menuBar.classList.toggle('active');
    closeBar.classList.toggle('active');

    

};
function hide(){

    menuBar.classList.toggle('active');
    closeBar.classList.remove('active');
    if(navMenu.classList.contains('show')){
        navMenu.classList.remove('show')
    }

};

menuBar.addEventListener('click', show);
closeBar.addEventListener('click', hide);