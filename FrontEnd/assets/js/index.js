function onAccessCodeFormSubmit(e) {
    e.preventDefault();
    
    var accessCode = document.getElementById('access-code-input').value;
    console.log('Access:', accessCode);

    axios.post('/api/checkAccessCodeValidity', { "accessCode": accessCode })
        .then(response => {
            if (response.isValid) {
                console.log("IT'S VALID");
            } else {
                console.log("NOT VALID");
            }
        })

}
