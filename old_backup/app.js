document.addEventListener('DOMContentLoaded', () => {
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Handle "Pedir Ahora" buttons in product cards
    const orderButtons = document.querySelectorAll('.btn-order');
    const interestSelect = document.getElementById('interest');
    
    orderButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const product = e.target.getAttribute('data-product');
            if (interestSelect) {
                // Set the select value to the product
                Array.from(interestSelect.options).forEach(option => {
                    if (option.value === product) {
                        option.selected = true;
                    }
                });
            }
            
            // Scroll to order section
            document.querySelector('#order').scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Handle form submission to WhatsApp
    const orderForm = document.getElementById('order-form');
    orderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = document.getElementById('name').value;
        const interest = document.getElementById('interest').value;
        const message = document.getElementById('message').value;
        
        // Format the message for WhatsApp
        const waText = `¡Hola J&M Resin Art! 👋%0AMi nombre es *${name}*.%0A%0AEstoy interesado/a en: *${interest}*.%0A%0ADetalles adicionales:%0A${message}`;
        
        // J&M Instagram doesn't provide a direct phone number in the bio, 
        // they just mention "Pedidos por WA" so we will use a placeholder or prompt the user.
        // Assuming a placeholder number for Ecuador (+593)
        const waNumber = "593999999999"; 
        const waUrl = `https://wa.me/${waNumber}?text=${waText}`;
        
        window.open(waUrl, '_blank');
    });
});
