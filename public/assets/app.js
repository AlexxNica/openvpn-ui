(function(exports) {

  // Control flow: UI event -> effect state change -> trigger state change event -> update UI
  // AJAX: send request -> process response -> trigger state change
  // DO NOT update state directly from state change listener! (endless loops WILL happen)

  var listeners = [];

  var passwordMinLength = 5;
  var nameMinLength = 5;

  var endpointSelector = document.getElementById("select-endpoint");
  var passwordInput = document.getElementById("input-password");
  var nameInput = document.getElementById("input-name");
  var generatePasswordButton = document.getElementById("generate-password");
  var passwordStrengthBox = document.getElementById("password-strength");
  var submitButton = document.getElementById("submit-generate");
  var resetButton = document.getElementById("reset-form");
  var settingsForm = document.getElementById("settings-form");
  var warningPane = document.getElementById("warnings");
  var waitPlease = document.getElementById("wait-please");
  var downloadSection = document.getElementById("download-section");
  var downloadLink = document.getElementById("download-link");


  // central state for app
  // events are triggered every time it changes
  var state = {
    endpoint: getSelected(endpointSelector),
    password: "",
    name: nameInput.value,
    requestPending: false,
    downloadUrl: null,
    error: null,
    isValid: true
  };

  function updateState(update) {
    state = Object.assign({}, state, update);
    // primitive event dispatcher
    listeners.forEach(function(l) {l.call(null, update)});
  }

  function onStateChange(listener) {
    listeners.push(listener);
  }

  // Validate and update password  in state (valid or not)
  function updatePassword(value) {
    passwordInput.value = value;
    var passwordStrength = value.length;
    updateState({
      password: value,
      passwordStrength: passwordStrength
    });
  }

  // Validate and update name in state (valid or not)
  function updateName(value) {
    nameInput.value = value
    updateState({name: value});
  }

  function resetForm() {
    updateName("");
    updatePassword("");
    passwordInput.setAttribute("type", "passw");
    passwordStrengthBox.innerHTML = "";
  }
  
  function handleError(message) {
    updateState({error: message});
  }

  function generatePassword() {
    var pwgen = new PWGen();
    pwgen.maxLength = new Number(20);
    pwgen.includeCapitalLetter = true;
    pwgen.includeNumber = true;
    password = pwgen.generate();

    passwordInput.setAttribute("type", "text");
    updatePassword(password);
  }

  // Listen to changes in passwordStrength, update password strength display
  function displayPasswordStrength(stateChange) {
    if (stateChange.passwordStrength != undefined) {
      renderPasswordStrength(state.passwordStrength);
    }
  }

  // Listen to change in error state, append a warning if needed
  function displayError(stateChange) {
    if (stateChange.error) {
      showWarning(state.error);
    }
  }

  // Listen to change in download state, toggle download section accordingly
  function toggleDownloadSection(stateChange) {
    if (stateChange.downloadUrl !== undefined) {
      if (state.downloadUrl) {
        downloadLink.setAttribute("href", state.downloadUrl);
        downloadSection.classList.add("visible");
      }
      else {
        downloadLink.setAttribute("href", "");
        downloadSection.classList.remove("visible");
      }
    }
  }

  // Validate if all form inputs are correct
  function validate() {
    var isValid = true;
    isValid = isValid && state.name.length >= nameMinLength;
    isValid = isValid && state.passwordStrength >= passwordMinLength;
    return isValid;
  }

  // Listen to changes in form validation state, enable/disable submit button
  function checkButtonState(stateChange) {
    var isValid = validate();
    var isPending = false;

    if (stateChange.pending != undefined) {
        if (state.pending == true) {
          isPending = true;
          submitButton.classList.add("pending");
          waitPlease.classList.add("visible");
        }
        else {
          submitButton.classList.remove("pending");
          waitPlease.classList.remove("visible");
        }
    }

    if (isValid && !isPending) {
      submitButton.removeAttribute("disabled");
    } 
    else {
      submitButton.setAttribute("disabled", "disabled");
    }
  }

  // Append a warning to the warning pane. It will be unceremoniously removed after 5 seconds
  function showWarning(message) {
    var node = document.createElement("div");
    node.setAttribute("class", "alert alert-warning");
    node.setAttribute("role", "alert");
    node.textContent = message;
    warningPane.appendChild(node);
    setTimeout(function() {
      node.remove();
    }, 5000);
  }

  // Send request to backend to generate config, when result is retrieved update state
  function generateConfig() {
    var payload = {
      name: state.name,
      endpoint: state.endpoint,
      passphrase: state.password
    };
    var opts = {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-type": "application/json",
        "Accept": "application/json"
      },
      credentials: "same-origin"
    };

    updateState({pending: true});

    fetch("/certs", opts)
      .then(function(response) {
        return decodeResponse(response);
      })
      .then(function(data) {
        var url = baseUrl() + data.configPath;
        updateState({
          pending: false,
          downloadUrl: url
        });
      })
      .catch(function(error) {
        updateState({pending: false});
        handleError(error.message || error);
      });
  }

  // Decode response, resolve to parsed data if status is OK-ish, else reject
  function decodeResponse(response) {
    if (response.status >= 400) {
      return response.json().then(function(data) {
        return Promise.reject(Error(data.message));
      });
    } else {
      return response.json();
    }
  }

  // Update the password strength info text
  function renderPasswordStrength(value) {
    var elem = document.createElement("span");
    var msg = "Length: "+value+"";
    var style = "pwnok";

    if (value > passwordMinLength) {
      style = "pwok";
      msg += " ✓";
    }

    elem.classList.add(style);
    elem.innerHTML = msg;
    passwordStrengthBox.innerHTML = '';
    passwordStrengthBox.appendChild(elem);
  }

  // Utilities
  function getSelected(selectElement) {
    var idx = selectElement.selectedIndex;
    return selectElement.options[idx].value;
  }

  // Return hostname and pathname components of current URL
  function baseUrl() {
    return window.location.protocol
      + "//" + window.location.host
      + window.location.pathname.replace(/\/$/, "");
  }

  // Wire up actions
  endpointSelector.addEventListener("change", function(e) {
    var value = getSelected(e.target);
    updateState({endpoint: value});
  });

  passwordInput.addEventListener("keyup", function(e) {
    updatePassword(e.target.value);
  });

  generatePasswordButton.addEventListener("mouseup", function(e) {
    e.preventDefault();
    generatePassword();
  });

  resetButton.addEventListener("mouseup", function(e) {
    e.preventDefault();
    resetForm();
  });

  nameInput.addEventListener("keyup", function(e) {
    updateName(e.target.value);
  });

  settingsForm.addEventListener("submit", function(e) {
    e.preventDefault();
    generateConfig();
  });


  onStateChange(checkButtonState);
  onStateChange(displayPasswordStrength);
  onStateChange(displayError);
  onStateChange(toggleDownloadSection);

})(window);
