 async function retryPayment(orderId) {
    try {
      const res = await fetch(`/retry-payment/${orderId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      if (!data.success) {
            Swal.fire({
                icon: 'error',
                title: 'Payment Failed',
                text: 'Something went wrong. Please try again.',
                confirmButtonColor: '#d33'
            });        
            return;
      }

      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: "The Elegant Adobe",
        description: "Retry Payment",
        order_id: data.razorpay_order_id,
        handler: async function (response) {
          const verifyRes = await fetch("/verify-razorpay-payment", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              formData: { orderId }, // send only orderId here
              isRetry: true
            }),
          });

          const result = await verifyRes.json();

          if (result.success) {
            window.location.href = "/order-success";
          } else {
            Swal.fire({
              icon: 'error',
              title: 'Verification Failed',
              text: 'Payment could not be verified.',
              confirmButtonColor: '#d33'
            });
          }
        },
        theme: {
          color: "#F37254",
        },
        modal: {
          ondismiss: function () {
            // User closed the Razorpay popup without completing payment
            window.location.replace("/retry/payment-failed");
          }
        }
      };

      const rzp = new Razorpay(options);

    rzp.on("payment.failed", function (response) {
  console.error("Payment Failed:", response.error);
  
  // You can optionally POST the error to the backend if you want to log it
  fetch('/retry/razorpay-payment-failed', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ orderId }) // optional: send failure details
  }).then(() => {
    // After server receives it, redirect to failure page
    window.location.href = "/retry/payment-failed";
  }).catch(() => {
    // Even if POST fails, still redirect
    Swal.fire({
      icon: 'error',
      title: 'Something went wrong!',
      text: 'We couldn’t log the payment failure. Please try again later.',
      confirmButtonColor: '#d33'
    });
  });
});


      rzp.open();

    } catch (err) {
      console.error("Retry error:", err);
      Swal.fire({
        icon: 'error',
        title: 'Unexpected Error',
        text: 'Unable to initiate retry. Please check your internet connection or try again later.',
        confirmButtonColor: '#d33'
      });
    }
  }