/* Imp Serial Pipeline Device
    by: Jim Lindblom
    SparkFun Electronics
    date: March 24, 2014
    license: Beerware. Use, reuse, and modify this code however you see fit.
    If you find it useful, buy me a beer some day!

    The Serial Pipeline model is designed to pass serial data from one imp to
    another, anywhere across the world. Data transfers look like this:

    Arduino 1 Serial Out to Imp 1 -> Imp 1 passes serial data to Agent 1 ->
    Agent 1 passes data to Agent 2 -> Agent 2 passes data to Imp 2 -> Imp 2
    passes data to Arduino 2 over serial. Whew.

    A second Serial Pipeline model should be created to be a near exact
    copy of this, except the agentURL variable (on the agent code) should be 
    modified to the URL of this device's agent.

    The device must accomplish two tasks:
        1. On serial data in, send it off to the agent. The agent will send that
        data off to the other agent.
        2. On data coming in from the agent, send it through the serial port.

    Resources:
    http://electricimp.com/docs/api/hardware/uart/configure/
    http://natemcbean.com/2014/03/imp-to-imp-communication/
*/

////////////////////////////////////////
// Global Variables                   //
////////////////////////////////////////
local rxLEDToggle = 1;  // These variables keep track of rx/tx LED state
local txLEDToggle = 1;
arduino <- hardware.uart57;
rxLed <- hardware.pin8;
txLed <- hardware.pin9;

////////////////////////////////////////
// Function definitions               //
////////////////////////////////////////
// initUart() will simply initialize the UART pins, baud rate, parity, and
//  callback function.
function initUart()
{
    hardware.configure(UART_57);    // Using UART on pins 5 and 7
    // 19200 baud works well, no parity, 1 stop bit, 8 data bits.
    // Provide a callback function, serialRead, to be called when data comes in:
    arduino.configure(19200, 8, PARITY_NONE, 1, NO_CTSRTS, serialRead);
}

// serialRead() will be called whenever serial data is passed to the imp. It
//  will read the data in, and send it out to the agent.
function serialRead()
{
    local c = arduino.read(); // Read serial char into variable c
    while(c != -1) // Loop until no valid characters are read:
    {
        // Send 'c' to the agent, under the label "impSerialIn":
        agent.send("impSerialIn", c);
        toggleRxLED();  // toggle the RX LED indicator
        c = arduino.read(); // Read more, just in case.
    }
}

// agent.on("dataToSerial") will be called whenever the agent passes data labeled
//  "dataToSerial" over to the device. This data should be sent out the serial
//  port, to the Arduino.
agent.on("dataToSerial", function(c)
{
    arduino.write(c.tointeger()); // Write the data out the serial port.
    toggleTxLED(); // Toggle the TX LED indicator
});

// initLEDs() simply initializes the LEDs, and turns them off. Remember that the
// LEDs are active low (writing high turns them off).
function initLEDs()
{
    // LEDs are on pins 8 and 9 on the imp Shield. Configure them as outputs,
    //  and turn them off:
    rxLed.configure(DIGITAL_OUT);
    txLed.configure(DIGITAL_OUT);
    rxLed.write(1);
    txLed.write(1);
}

// This function turns an LED on/off quickly on pin 9.
// It first turns the LED on, then calls itself again in 50ms to turn the LED off
function toggleTxLED()
{
    txLEDToggle = txLEDToggle?0:1;    // toggle the txLEDtoggle variable
    if (!txLEDToggle)
    {
        imp.wakeup(0.05, toggleTxLED.bindenv(this)); // if we're turning the LED on, set a timer to call this function again (to turn the LED off)
    }
    txLed.write(txLEDToggle);  // TX LED is on pin 8 (active-low)
}

// This function turns an LED on/off quickly on pin 8.
// It first turns the LED on, then calls itself again in 50ms to turn the LED off
function toggleRxLED()
{
    rxLEDToggle = rxLEDToggle?0:1;    // toggle the rxLEDtoggle variable
    if (!rxLEDToggle)
    {
        imp.wakeup(0.05, toggleRxLED.bindenv(this)); // if we're turning the LED on, set a timer to call this function again (to turn the LED off)
    }
    rxLed.write(rxLEDToggle);   // RX LED is on pin 8 (active-low)
}

///////////
// Setup //
///////////
server.log("Serial Pipeline Open!"); // A warm greeting to indicate we've begun
initLEDs(); // Initialize the LEDs
initUart(); // Initialize the UART
// From here, all of our main action will take place in serialRead() and the
// agent.on functions. It's all event-driven.
