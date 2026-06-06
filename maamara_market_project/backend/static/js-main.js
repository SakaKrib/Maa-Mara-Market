


async function performSearch() {
    const query = document.getElementById("search_engine").value;
    if (!query) {
        document.getElementById("search-results").style.display = "none";
        return;
    }

    try {
        const response = await fetch(`http://127.0.0.1:8000/search/?query=${encodeURIComponent(query)}`);
        const data = await response.json();

        let resultsContainer = document.getElementById("search-results");
        resultsContainer.innerHTML = "";

        if (data.results.length > 0) {
            resultsContainer.style.display = "block";
            data.results.forEach(item => {
                let resultElement = document.createElement("div");
                resultElement.className = "result-item";
                resultElement.innerHTML = `
                    <strong>${item.name}</strong> <br>
                    Category: ${item.category} <br>
                    Reviews: ${item.reviews} Reviews
                `;
                resultElement.onclick = () => {
                    document.getElementById("search_engine").value = item.name;
                    resultsContainer.style.display = "none";
                };
                resultsContainer.appendChild(resultElement);
            });
        } else {
            resultsContainer.style.display = "none";
        }
    } catch (error) {
        console.error("Error fetching search results:", error);
    }
}








// when menu button is clicked show/hide some windows//

const toggle_menu = document.querySelector('.toggle');
console.log(toggle_menu);

const toggleClose = document.querySelector('.close-icon');
console.log(toggleClose);

const main = document.querySelector('main');
console.log(main);

const sidebar = document.querySelector('.top_navbar');
console.log(sidebar);

const sidetext = document.querySelectorAll('.top_navbar ul li a'); // Updated to target inner text elements
console.log(sidetext);

const disp = document.querySelector('.top_navbar span')
console.log(disp);

//show/hide-left_navigation//
const left_nav = document.querySelector('.left_window');
console.log(left_nav);

const middleWindow = document.querySelector('.middle_window');


const favorite = document.querySelector('.Favourite_container');

let slider = document.querySelector('.slider');


let animation = document.querySelector('.animation_text');

let productList = document.querySelector('.productlist');

let NewArrivals = document.querySelector('.new-arrivals');






///////function(active)///////
function onclick(){
disp.classList.toggle('active');
sidebar.classList.toggle('active');
main.classList.toggle('active');
toggle_menu.classList.toggle('active');
left_nav.classList.toggle('active');
slider.classList.toggle('active');
toggle_menu.classList.add('none');




// need to loop through nodelist to apply class toggle


   }

function close(){
    sidebar.classList.remove('active');
    left_nav.classList.remove('active');
    slider.classList.remove('active');
    slider.classList.remove('live');
    toggle_menu.classList.remove('none');
    toggle_menu.classList.remove('active');
    sidebar.classList.remove('retain');
    
}   

toggle_menu.addEventListener('click', onclick);
toggleClose.addEventListener('click', close);


//search icon onclick show

const searchIcon = document.querySelector('.search-outline');
console.log(searchIcon);


const searchInput = document.querySelector('.search-input');
console.log(searchInput);

searchInput.classList.add('none');
function view(){
    searchInput.classList.toggle('none');
    searchInput.classList.toggle('list-items');
    
    if(searchInput.classList.contains('none')){
        searchInput.classList.add('list-items');
    }else{
        searchIcon.classList.add('list-items')
    };
};

searchIcon.addEventListener('click', view);






                //when love icon is clicked, add product to favourites container//

// Variables
const favourite_button = document.querySelector('.Favourite');
let favourites = document.querySelector('.Favourite_container');

const fav_no = document.querySelector('.favourite-number-count');
const count = document.querySelector('#count');

const toggleMenu = document.querySelector('.toggle');
console.log(toggleMenu);


//function for trigering the togle to display favaourite container after login
function render(){

    favorite.classList.toggle('activate');
};

toggleMenu.addEventListener('click', render);


// Hide favorites initially
favourites.classList.add('none');

function press() {
    favourites.classList.toggle('none');
    slider.classList.toggle('live');
}

favourite_button.addEventListener('click', press);



// Listen for "love" button clicks to add or remove items
// Store liked items to prevent multiple fetch calls
let likedItems = new Set();

// Function to handle liking action
function likeItem(itemId) {
    if (likedItems.has(itemId)) {
        console.warn(`Item ${itemId} already liked!`);
        return; // Exit if item was already liked
    }

    likedItems.add(itemId); // Mark item as liked

    // Function to get CSRF token from cookies
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.startsWith(name + '=')) {
                cookieValue = cookie.substring(name.length + 1);
                break;
            }
        }
    }
    return cookieValue;
}

    fetch(`/like-item/${itemId}/`, {
        method: "POST",
        headers: {
            "X-CSRFToken": getCookie("csrftoken"),
            "Content-Type": "application/json",
        },
        body: JSON.stringify({})
    })
    .then(response => response.json())  // Parse JSON response
    .then(data => {
        console.log(`Liked item ${itemId}:`, data);
        if (data.success) {
            const message = `❤️ Liked! Total Likes: ${data.likes}`;
            return message; // Return message instead of console loggi
        }
    })
    .catch(error => console.error("Fetch error:", error));
}

document.querySelectorAll('.love').forEach(loveButton => {
    loveButton.addEventListener('click', event => {
        const content = event.target.closest('.content');
        const itemId = event.target.closest('.love')?.id;
        if (itemId) likeItem(itemId);

        if (!itemId) {
            console.error("itemId is undefined!");
            return;
        }
        toggleFav(content, loveButton); // Pass the button to update state

        
        
        
    });
});

// Function to toggle favorite status
const toggleFav = (content, loveButton) => {
    const productImgSrc = content.querySelector("img").src;
    const productTitle = content.querySelector(".item_name").textContent;
    const productPrice = content.querySelector(".price").textContent;
    const buttonId = loveButton.getAttribute('id'); // Unique identifier for the button

    let favItems = JSON.parse(localStorage.getItem("favorites")) || [];
    let existingItemIndex = favItems.findIndex(item => item.title === productTitle);

    if (existingItemIndex !== -1) {
        // Remove item from favorites
        favItems.splice(existingItemIndex, 1);
        localStorage.setItem("favorites", JSON.stringify(favItems));

        removeFromFav(productTitle);

        // Save the button state (color) in local storage
        localStorage.setItem(buttonId, 'cleared');
        loveButton.classList.remove('like'); // Update love button state visually
    } else {
        // Add item to favorites
        favItems.push({ img: productImgSrc, title: productTitle, price: productPrice });
        localStorage.setItem("favorites", JSON.stringify(favItems));

        // Save the button state (color) in local storage
        localStorage.setItem(buttonId, 'liked');
        loveButton.classList.add('like'); // Update love button state visually
    }

    updateFavCount();
};

// Function to add an item to favorites visually
const addToFav = (imgSrc, title, price) => {
    const favBox = document.createElement('div');
    favBox.classList.add('favContainer');
    favBox.innerHTML = `
        <div class="image"><img src="${imgSrc}" alt="">
        <div class="product_name"><p>${title}</p></div>
        <h1>${price}</h1>
        <div class="icons">
            <span class="delete"><ion-icon name="trash-sharp"></ion-icon></span>
            <span class="add-to-cart"><ion-icon name="cart-sharp"></ion-icon></span>
        </div></div>`;

    favourites.appendChild(favBox);

    // Add event listener to remove item
    favBox.querySelector(".delete").addEventListener("click", () => {
        removeFromFav(title);
    });
};

// Remove all items from favorites
const clearButton = document.querySelector('.clear');
console.log(clearButton);
function clearFavorites() {
    document.querySelectorAll(".favContainer").forEach(favBox => favBox.remove());
    localStorage.removeItem("favorites");

    document.querySelectorAll('.love').forEach(loveButton => {
        const buttonId = loveButton.getAttribute('id');
        localStorage.setItem(buttonId, 'cleared');
        loveButton.classList.remove('like'); // Reset button state visually
    });

    updateFavCount();
}

clearButton.addEventListener('click', clearFavorites);

// Function to remove an item from favorites visually and update button state
const removeFromFav = (productTitle) => {
    let favBoxes = document.querySelectorAll(".favContainer");
    favBoxes.forEach(favBox => {
        if (favBox.querySelector(".product_name p").textContent === productTitle) {
            favBox.remove();
        }
    });

    let favItems = JSON.parse(localStorage.getItem("favorites")) || [];
    favItems = favItems.filter(item => item.title !== productTitle);
    localStorage.setItem("favorites", JSON.stringify(favItems));

    // Update love button state
    document.querySelectorAll('.love').forEach(loveButton => {
        if (loveButton.closest('.content')?.querySelector('.item_name').textContent === productTitle) {
            const buttonId = loveButton.getAttribute('id');
            localStorage.setItem(buttonId, 'cleared');
            loveButton.classList.remove('like'); // Update love button state visually
        }
    });

    updateFavCount();
};

// Function to update favorite count
const updateFavCount = () => {
    let favItems = JSON.parse(localStorage.getItem("favorites")) || [];
    fav_no.textContent = favItems.length;
    count.textContent = favItems.length;
};

// Load saved favorites and button states from local storage on page load
document.addEventListener("DOMContentLoaded", () => {
    let favItems = JSON.parse(localStorage.getItem("favorites")) || [];
    favItems.forEach(item => {
        addToFav(item.img, item.title, item.price);
    });

    document.querySelectorAll('.love').forEach(loveButton => {
        const buttonId = loveButton.getAttribute('id');
        const buttonState = localStorage.getItem(buttonId);

        if (buttonState === 'liked') {
            loveButton.classList.add('like');
        } else {
            loveButton.classList.remove('like');
        }
    });

    updateFavCount();
});
            





