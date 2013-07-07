/*
 * validate.js 1.2.2
 * Copyright (c) 2011 Rick Harrison, http://rickharrison.me
 * validate.js is open sourced under the MIT license.
 * Portions of validate.js are inspired by CodeIgniter.
 * http://rickharrison.github.com/validate.js
 */

(function(window, document, undefined) {
    /*
     * If you would like an application-wide config, change these defaults.
     * Otherwise, use the setMessage() function to configure form specific messages.
     */

    var defaults = {
        messages: {
            required: 'The %s field is required.',
            matches: 'The %s field does not match the %s field.',
            default: 'The %s field is still set to default, please change.',
            valid_email: 'The %s field must contain a valid email address.',
            valid_emails: 'The %s field must contain all valid email addresses.',
            min_length: 'The %s field must be at least %s characters in length.',
            max_length: 'The %s field must not exceed %s characters in length.',
            exact_length: 'The %s field must be exactly %s characters in length.',
            greater_than: 'The %s field must contain a number greater than %s.',
            less_than: 'The %s field must contain a number less than %s.',
            alpha: 'The %s field must only contain alphabetical characters.',
            alpha_numeric: 'The %s field must only contain alpha-numeric characters.',
            alpha_dash: 'The %s field must only contain alpha-numeric characters, underscores, and dashes.',
            numeric: 'The %s field must contain only numbers.',
            integer: 'The %s field must contain an integer.',
            decimal: 'The %s field must contain a decimal number.',
            is_natural: 'The %s field must contain only positive numbers.',
            is_natural_no_zero: 'The %s field must contain a number greater than zero.',
            valid_ip: 'The %s field must contain a valid IP.',
            valid_base64: 'The %s field must contain a base64 string.',
            valid_credit_card: 'The %s field must contain a valid credit card number.',
            is_file_type: 'The %s field must contain only %s files.',
            valid_url: 'The %s field must contain a valid URL.',
            valid_url_without_http: 'The %s field must contain a valid URL.',
            uk_phone_number: 'The %s field must contain a valid UK phone number.',
            uk_postcode: 'The %s field must contain a full UK postcode.',
        },
        callback: function(errors) {

        }
    };

    /*
     * Define the regular expressions that will be used
     */

    var ruleRegex = /^(.+?)\[(.+)\]$/,
        numericRegex = /^[0-9]+$/,
        integerRegex = /^\-?[0-9]+$/,
        decimalRegex = /^\-?[0-9]*\.?[0-9]+$/,
        emailRegex = /^[a-zA-Z0-9.!#$%&amp;'*+\-\/=?\^_`{|}~\-]+@[a-zA-Z0-9\-]+(?:\.[a-zA-Z0-9\-]+)*$/,
        alphaRegex = /^[a-z]+$/i,
        alphaNumericRegex = /^[a-z0-9]+$/i,
        alphaDashRegex = /^[a-z0-9_\-]+$/i,
        naturalRegex = /^[0-9]+$/i,
        naturalNoZeroRegex = /^[1-9][0-9]*$/i,
        ipRegex = /^((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\.){3}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})$/i,
        base64Regex = /[^a-zA-Z0-9\/\+=]/i,
        numericDashRegex = /^[\d\-\s]+$/,
        urlRegex = /^((http|https):\/\/(\w+:{0,1}\w*@)?(\S+)|)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?$/,
        urlWithoutHttpRegex = /^(((http|https):\/\/)?(\w+:{0,1}\w*@)?(\S+)|)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?$/,
        ukPhoneNumber = /^(((\+44\s?\d{4}|\(?0\d{4}\)?)\s?\d{3}\s?\d{3})|((\+44\s?\d{3}|\(?0\d{3}\)?)\s?\d{3}\s?\d{4})|((\+44\s?\d{2}|\(?0\d{2}\)?)\s?\d{4}\s?\d{4}))(\s?\#(\d{4}|\d{3}))?$/,
        ukPostcode = /^(GIR 0AA|[A-PR-UWYZ]([0-9][0-9A-HJKPS-UW]?|[A-HK-Y][0-9][0-9ABEHMNPRV-Y]?)[\s]{0,1}[0-9][ABD-HJLNP-UW-Z]{2})$/;

    /*
     * The exposed public object to validate a form:
     *
     * @param formNameOrNode - String - The name attribute of the form (i.e. <form name="myForm"></form>) or node of the form element
     * @param fields - Array - [{
     *     name: The name of the element (i.e. <input name="myField" />)
     *     display: 'Field Name'
     *     rules: required|matches[password_confirm]
     * }]
     * @param callback - Function - The callback after validation has been performed.
     *     @argument errors - An array of validation errors
     *     @argument event - The javascript event
     */

    var FormValidator = function(formNameOrNode, fields, callback) {
        this.callback = callback || defaults.callback;
        this.errors = [];
        this.fields = {};
        this.form = this._formByNameOrNode(formNameOrNode) || {};
        this.messages = {};
        this.handlers = {};

        for (var i = 0, fieldLength = fields.length; i < fieldLength; i++) {
            var field = fields[i];

            // If passed in incorrectly, we need to skip the field.
            if ((!field.name && !field.names) || !field.rules) {
                continue;
            }

            /*
             * Build the master fields array that has all the information needed to validate
             */

            if (field.names) {
                for (var j = 0; j < field.names.length; j++) {
                    this._addField(field, field.names[j]);
                }
            } else {
                this._addField(field, field.name);
            }
        }
    },

    attributeValue = function (element, attributeName) {
        var i;

        if ((element.length > 0) && (element[0].type === 'radio')) {
            for (i = 0; i < element.length; i++) {
                if (element[i].checked) {
                    return element[i][attributeName];
                }
            }

            return;
        }

        return element[attributeName];
    };

    /*
     * @public
     * Sets a custom message for one of the rules
     */

    FormValidator.prototype.setMessage = function(rule, message) {
        this.messages[rule] = message;

        // return this for chaining
        return this;
    };

    /*
     * @public
     * Registers a callback for a custom rule (i.e. callback_username_check)
     */

    FormValidator.prototype.registerCallback = function(name, handler) {
        if (name && typeof name === 'string' && handler && typeof handler === 'function') {
            this.handlers[name] = handler;
        }

        // return this for chaining
        return this;
    };

    /*
     * @private
     * Determines if a form dom node was passed in or just a string representing the form name
     */

    FormValidator.prototype._formByNameOrNode = function(formNameOrNode) {
        return (typeof formNameOrNode === 'object') ? formNameOrNode : document.forms[formNameOrNode];
    };

    /*
     * @private
     * Adds a file to the master fields array
     */

    FormValidator.prototype._addField = function(field, nameValue)  {
        this.fields[nameValue] = {
            name: nameValue,
            display: field.display || nameValue,
            rules: field.rules,
            id: null,
            type: null,
            value: null,
            checked: null
        };
    };

    /*
     * @private
     * Runs the validation when the form is submitted.
     */

    FormValidator.prototype.validateForm = function() {
        this.errors = [];
        var values = {};

        for (var key in this.fields) {
            if (this.fields.hasOwnProperty(key)) {
                var field = this.fields[key] || {},
                    element = this.form[field.name];

                if (element && element !== undefined) {
                    field.id = attributeValue(element, 'id');
                    field.type = (element.length > 0) ? element[0].type : element.type;
                    field.value = attributeValue(element, 'value');
                    field.checked = attributeValue(element, 'checked');

                    /*
                     * Run through the rules for each field.
                     */

                    values[key] = this._validateField(field);
                }
            }
        }

        if (typeof this.callback === 'function') {
            this.callback(this.errors, values);
        }
    };

    /*
     * @private
     * Looks at the fields value and evaluates it against the given rules
     */

    FormValidator.prototype._validateField = function(field) {
        var rules = field.rules.split('|');

        /*
         * If the value is null and not required, we don't need to run through validation, unless the rule is a callback, but then only if the value is not null
         */

        if ( (field.rules.indexOf('required') === -1 && (!field.value || field.value === '' || field.value === undefined)) && (field.rules.indexOf('callback_') === -1 || field.value === null) ) {
            return;
        }

        /*
         * Run through the rules and execute the validation methods as needed
         */

        var value = field.value;

        for (var i = 0, ruleLength = rules.length; i < ruleLength; i++) {
            var method = rules[i],
                param = null,
                failed = false,
                parts = ruleRegex.exec(method);

            // Trim the value
            if (method === 'trim') {
                value = value.trim();
                continue;
            }

            /*
             * If the rule has a parameter (i.e. matches[param]) split it out
             */

            if (parts) {
                method = parts[1];
                param = parts[2];
            }

            /*
             * If the hook is defined, run it to find any validation errors
             */

            if (typeof this._hooks[method] === 'function') {
                if (!this._hooks[method].apply(this, [value, field, param])) {
                    failed = true;
                }
            } else if (method.substring(0, 9) === 'callback_') {
                // Custom method. Execute the handler if it was registered
                method = method.substring(9, method.length);

                if (typeof this.handlers[method] === 'function') {
                    if (this.handlers[method].apply(this, [value, field, param]) === false) {
                        failed = true;
                    }
                }
            }

            /*
             * If the hook failed, add a message to the errors array
             */

            if (failed) {
                // Make sure we have a message for this rule
                var source = this.messages[method] || defaults.messages[method],
                    message = 'An error has occurred with the ' + field.display + ' field.';

                if (source) {
                    message = source.replace('%s', field.display);

                    if (param) {
                        message = message.replace('%s', (this.fields[param]) ? this.fields[param].display : param);
                    }
                }

                this.errors.push({
                    id: field.id,
                    name: field.name,
                    message: message,
                    rule: method
                });

                // Break out so as to not spam with validation errors (i.e. required and valid_email)
                return null;
            }
        }

        return value;
    };

    /*
     * @private
     * Object containing all of the validation hooks
     */

    FormValidator.prototype._hooks = {
        required: function(value, field) {
            if ((field.type === 'checkbox') || (field.type === 'radio')) {
                return (field.checked === true);
            }

            return (value !== null && value !== '');
        },

        default: function(value, field, defaultName){
            return value !== defaultName;
        },

        matches: function(value, field, matchName) {
            var el = this.form[matchName];

            if (el) {
                return value === el.value;
            }

            return false;
        },

        valid_email: function(value, field) {
            return emailRegex.test(value);
        },

        valid_emails: function(value, field) {
            var result = value.split(",");

            for (var i = 0; i < result.length; i++) {
                if (!emailRegex.test(result[i])) {
                    return false;
                }
            }

            return true;
        },

        min_length: function(value, field, length) {
            if (!numericRegex.test(length)) {
                return false;
            }

            return (value.length >= parseInt(length, 10));
        },

        max_length: function(value, field, length) {
            if (!numericRegex.test(length)) {
                return false;
            }

            return (value.length <= parseInt(length, 10));
        },

        exact_length: function(value, field, length) {
            if (!numericRegex.test(length)) {
                return false;
            }

            return (value.length === parseInt(length, 10));
        },

        greater_than: function(value, field, param) {
            if (!decimalRegex.test(value)) {
                return false;
            }

            return (parseFloat(value) > parseFloat(param));
        },

        less_than: function(value, field, param) {
            if (!decimalRegex.test(value)) {
                return false;
            }

            return (parseFloat(value) < parseFloat(param));
        },

        alpha: function(value, field) {
            return (alphaRegex.test(value));
        },

        alpha_numeric: function(value, field) {
            return (alphaNumericRegex.test(value));
        },

        alpha_dash: function(value, field) {
            return (alphaDashRegex.test(value));
        },

        numeric: function(value, field) {
            return (numericRegex.test(value));
        },

        integer: function(value, field) {
            return (integerRegex.test(value));
        },

        decimal: function(value, field) {
            return (decimalRegex.test(value));
        },

        is_natural: function(value, field) {
            return (naturalRegex.test(value));
        },

        is_natural_no_zero: function(value, field) {
            return (naturalNoZeroRegex.test(value));
        },

        valid_ip: function(value, field) {
            return (ipRegex.test(value));
        },

        valid_base64: function(value, field) {
            return (base64Regex.test(value));
        },

        valid_url: function(value, field) {
            return (urlRegex.test(value));
        },

        valid_url_without_http: function(value, field) {
            return (urlWithoutHttpRegex.test(value));
        },

        uk_phone_number: function(value, field) {
            return (ukPhoneNumber.test(value));
        },

        uk_postcode: function(value, field) {
            return (ukPostcode.test(value));
        },

        valid_credit_card: function(value, field){
            // Luhn Check Code from https://gist.github.com/4075533
            // accept only digits, dashes or spaces
            if (!numericDashRegex.test(value)) return false;

            // The Luhn Algorithm. It's so pretty.
            var nCheck = 0, nDigit = 0, bEven = false;
            var strippedField = value.replace(/\D/g, "");

            for (var n = strippedField.length - 1; n >= 0; n--) {
                var cDigit = strippedField.charAt(n);
                nDigit = parseInt(cDigit, 10);
                if (bEven) {
                    if ((nDigit *= 2) > 9) nDigit -= 9;
                }

                nCheck += nDigit;
                bEven = !bEven;
            }

            return (nCheck % 10) === 0;
        },

        is_file_type: function(value, field, type) {
            if (field.type !== 'file') {
                return true;
            }

            var ext = value.substr((value.lastIndexOf('.') + 1)),
                typeArray = type.split(','),
                inArray = false,
                i = 0,
                len = typeArray.length;

            for (i; i < len; i++) {
                if (ext == typeArray[i]) inArray = true;
            }

            return inArray;
        }
    };

    window.FormValidator = FormValidator;

})(window, document);
