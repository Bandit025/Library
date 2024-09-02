document.querySelector('form').addEventListener('submit', function(event) {
    event.preventDefault(); // ป้องกันการ submit form แบบปกติ
  
    var studentId = document.getElementById('studentId').value;
    
    fetch('/check_student', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ studentId: studentId }),
    })
    .then(response => response.json())
    .then(data => {
      if (data.exists) {
        console.log('Student exists in the database');
        if (data.status === 1) {
          console.log('Status is 1');
        } else {
          console.log('Status is not 1');
        }
      } else {
        console.log('Student does not exist in the database');
      }
    })
    .catch(error => {
      console.error('Error:', error);
    });
  });

  
  document.getElementById('student-form-out').addEventListener('submit', function (e) {
    e.preventDefault();
    const studentIdOut = document.getElementById('studentIdout').value;

    fetch('/checkout_student', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ studentId: studentIdOut }), // Send the student ID in the request body
    })
    .then(response => response.json())
    .then(data => console.log(data))
    .catch((error) => {
        console.error('Error:', error);
    });
});

// script.js
document.getElementById('mobile-menu').addEventListener('click', function() {
  document.querySelector('.nav-links').classList.toggle('nav-active');
});

