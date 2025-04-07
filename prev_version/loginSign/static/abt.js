// button/showHide/content--->about us

const button = document.querySelector('.FIND');
console.log(button);

const founder = document.querySelector('.founder');
console.log(founder);

founder.classList.add('dont_show');
function showHide(){
    
    founder.classList.toggle('show')
    founder.classList.toggle('dont_show')
    if(founder.classList.contains('dont_show')){
        founder.classList.add('show')
    }else{founder.classList.add('dont_show')}
}

button.addEventListener('click', showHide);


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
