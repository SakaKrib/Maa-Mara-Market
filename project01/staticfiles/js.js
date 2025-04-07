// like/unlike/button/toggle

const loveButtons = document.querySelectorAll(".love");
console.log(loveButtons);




loveButtons.forEach(loveButton => {
    loveButton.addEventListener("click", function() {
    
        loveButton.classList.add("dislike"); 
        loveButton.classList.toggle("like");
        loveButton.classList.toggle("dislike"); 
        if(loveButton.classList.contains("like")){
            console.log("item loved");alert('add to favourites?')
        }else{
            loveButton.classList.add("dislike")
        };
        console.log("item nuetral");
        
    });
});




// when menu button is clicked show/hide some windows//

const toggle_menu = document.querySelector('.toggle');
console.log(toggle_menu);

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


///////function(active)///////
function onclick(){
disp.classList.toggle('active');
sidebar.classList.toggle('active');
main.classList.toggle('active');
toggle_menu.classList.toggle('active');
left_nav.classList.toggle('active');


// need to loop through nodelist to apply class toggle
for (let i = 0; i < sidetext.length; i++) {
    if (sidetext[i].style.display === 'list-item') {
    sidetext[i].style.display = 'none';
  } else {
    sidetext[i].style.display = 'list-item';
  }
}

   }

toggle_menu.addEventListener('click', onclick);


//create a vendor add item to collection//

const seller_input = document.querySelector('.sell_container');
const sellProducts = document.querySelector('.sell');
console.log(sellProducts);

seller_input.classList.add('none')

function sell(){
    seller_input.classList.toggle('none');
    seller_input.classList.toggle('list-items');
    
    if(seller_input.classList.contains('none')){
        seller_input.classList.add('list-items')
    };
};

sellProducts.addEventListener('click', sell)

//when love icon is clicked, add product to favourites container//

let favourites = document.querySelector('.Favourite_container');
console.log(favourites);

//create a variable for product list on favourite list


const favourite_button = document.querySelector('.Favourite');
console.log(favourite_button);

favourites.classList.add('none');

function press(){
    favourites.classList.toggle('none');
}

favourite_button.addEventListener('click', press);

// add to loved favourites

const fav_no = document.querySelector('.fav-number');
console.log(fav_no);

const count  = document.querySelector('#count');
console.log(count);

loveButtons.forEach(loveButton => {
    loveButton.addEventListener('click', event => {
        const content = event.target.closest('.content');
        addToFav(content);
    });
});


const addToFav = content => {
    const productImgSrc = content.querySelector("img").src;
    const productTitle = content.querySelector(".item_name").textContent;
    const productPrice = content.querySelector(".price").textContent;


    //return items added more than once in the favcontainer

    const loved_items = favourites.querySelectorAll('.product_name');
    for (let item of loved_items){ 
        console.log(item.innerHTML)
        if (item.textContent === productTitle){
            alert('item already added to favourites');
            return;
        };
  };

//\/\/\/\/\/\/\//\/\\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/\/

    const favBox = document.createElement('div');

    favBox.classList.add('favContainer');

    favBox.innerHTML = `
            <div class="image"><img src="${productImgSrc}" alt=""></div>

            <div class="product_name"><p>${productTitle}</p></div>
            <h1>${productPrice}</h1>`;


            
//append a child Element

            favourites.appendChild(favBox);
            if (favBox.classList.contains('favContainer')){
               count.innerHTML ++; fav_no.innerHTML ++;
            }

 ///remove item from favourite list

        content.querySelector('.love').addEventListener('click', () => {
            favBox.remove('favContainer');alert('remove item from favourite list')
            if(count.innerHTML > 0){
                count.innerHTML --; fav_no.innerHTML --;
            }
        }
    );

    };
                               


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



// create varriables for cart icon/ cart conatiner/ add to cart btn/productlist

const cart = document.querySelector('.cart');

const cart_container = document.querySelector('.cart_container');
console.log(cart_container);

const cart_icon = document.querySelector('.cart-icon');
console.log(cart_icon);

const addToCartButton = document.querySelectorAll('.pluscart');
console.log(addToCartButton);

const productList = document.querySelector('.productlist');
console.log(productList);

const cartDetails = document.querySelector('.cart_details');




// when cart icon is clicked open cart_container

function click(){

    cart.classList.toggle('active');
    productList.classList.toggle('active');
    cartDetails.classList.toggle('active');
};

cart_icon.addEventListener('click', click);


//add selected products to cart list

addToCartButton.forEach(cartButton => {
    cartButton.addEventListener('click', event => {
        const productCard = event.target.closest('.content');
        addToCart(productCard);
    });
});


const productBox = document.querySelector('.cart_content');
const addToCart = productCard => {
    const productImgSrc = productCard.querySelector('img').src;
    const productTitle = productCard.querySelector('.item_name').textContent;
    const productPrice = productCard.querySelector('.price').textContent;
    const cart_number = document.querySelector('.number');
    const plusBtn = document.querySelector('#add').textContent;
    console.log(plusBtn);
    const minusBtn = document.querySelector('#minus').textContent;
    const item_Number = document.querySelector('.noOfItems').textContent;
    var cart_total = document.querySelector('.total-price');
    const delete_item = document.querySelector('.delete').textContent;


    

    // Correctway to get cart items and check for duplicates
    const cartItems = Array.from(cart_container.querySelectorAll('.ProductName')); // Convert NodeList to Array

    // Efficiently check for duplicates using `some()`
    const itemExists = cartItems.some(item => item.textContent === productTitle);
    if (itemExists) {
        alert('Item already in cart');
        return;
    };

    //set up delete btn to remove items from the cart

    const rmoveFromCartBtn = document.createElement('button');
    rmoveFromCartBtn.classList.add('trash');
    rmoveFromCartBtn.textContent = delete_item;

   
    

//productpriceelement/add class-productprice and in number convertion
    const productPriceElement = document.createElement('div');
    productPriceElement.classList.add('product-price');
    productPriceElement.textContent = productPrice;
     let price = productPriceElement.textContent.replace(',', '');
     const productprice = Number(price);

             //number qty number convertion
             let itemNumber = document.createElement('div');
             itemNumber.classList.add('cart_number');
             itemNumber.textContent = item_Number;
             

    
    let cartTotal = Number(cart_total.textContent);

    const itemPriceNumber = Number(itemNumber.textContent);

    // Create the cart item element
    const productCartBox = document.createElement('div');
    productCartBox.classList.add('productBoxInCart');
    if(productCartBox.classList.contains('productBoxInCart')){
        cart_number.textContent ++;
    };



    //add cart/item/quantity
    const itemPlus = document.createElement('button');
    itemPlus.classList.add('cart_plus');
    itemPlus.textContent = plusBtn;


    //minus btn
    const itemMinus = document.createElement('button');
    itemMinus.classList.add('cart_minus');
    itemMinus.textContent = minusBtn;


    
   
    
//appends childnotes//

    productCartBox.appendChild(itemPlus);
    productCartBox.appendChild(itemMinus);
    productCartBox.appendChild(itemNumber);
    productCartBox.appendChild(rmoveFromCartBtn);
    



    const productNameElement = document.createElement('div');
    productNameElement.classList.add('ProductName');
    productNameElement.textContent = productTitle;  // Set the text content directly


    productCartBox.appendChild(productNameElement); // Append to the productCartBox

     // Add other elements (image, price, etc.) similarly, using createElement and appendChild for better security and control.
    // Example:
    const productImage = document.createElement('img');
    productImage.src = productImgSrc;
    productCartBox.appendChild(productImage);


 //product price on cart

 productCartBox.appendChild(productPriceElement);



function press(){
    itemNumber.textContent ++; 
    cart_total.textContent = (Number(cart_total.textContent) + productprice).toFixed(2);
     cart_number.textContent ++;
};

itemPlus.addEventListener('click', press);

console.log(itemNumber)


///minus btn onclick

function onclick(){
    if(itemNumber.textContent > 1){
        itemNumber.textContent --;
        cart_total.textContent = (Number(cart_total.textContent) - productprice).toFixed(2) ;
            cart_number.textContent --;
            ;}}
            itemMinus.addEventListener('click', onclick);

    

    // Add the new product to the cart container
    cart_container.appendChild(productCartBox);
    console.log(cart_container)

    const updateTotal = () => {
    let total = 0;
       total += cartTotal + productprice * Number(itemNumber.textContent) ;
       cart_total.textContent = total.toFixed(2);
    };updateTotal()

    function remove() {
        productCartBox.remove();
        
        // Update the cart total
        const itemPrice = productprice * Number(itemNumber.textContent);
        cart_total.textContent = (Number(cart_total.textContent) - itemPrice).toFixed(2);
    
        // Decrease the cart number
        cart_number.textContent = cart_number.textContent - Number(itemNumber.textContent);
    }
    
    rmoveFromCartBtn.addEventListener('click', remove);
    
};

