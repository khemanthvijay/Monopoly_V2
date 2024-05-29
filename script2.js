function toggleFullScreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

class Property {
    constructor(name, price, position, group = null) {
        this.name = name;
        this.price = price;
        this.position = position;
        this.group = group; // Property group (e.g., 1 for Brown, 0 for Railroad, -1 for Utility)
        this.owner = null;
    }

    buy(player, gameInstance) {
        if (player.money >= this.price && !this.owner) {
            player.addSubMoney(true, this.price, gameInstance);
            this.owner = player.id;
            player.cards.push(this.name);
            return true;
        }
        return false;
    }

    payRent(player, gameInstance, rolled) {
        if (this.owner && this.owner !== player.id) {
            let rent = 0;
            const ownerPlayer = gameInstance.getPlayerById(this.owner);

            if (this.group > 0) {
                const propertiesInGroup = gameInstance.properties.filter(property => property.group === this.group);
                const ownerPropertiesInGroup = propertiesInGroup.filter(property => property.owner === this.owner);

                if (ownerPropertiesInGroup.length === propertiesInGroup.length) {
                    rent = parseInt((this.price / 100) * 20); // Higher rent for owning all properties in group
                } else {
                    rent = parseInt((this.price / 100) * 10); // Base rent
                }
            } else if (this.group === 0) {
                const ownerRailroads = gameInstance.properties.filter(property => property.group === 0 && property.owner === this.owner).length;
                rent = 50 * ownerRailroads; // $50 rent per owned railroad
            } else if (this.group === -1) {
                const ownerUtilities = gameInstance.properties.filter(property => property.group === -1 && property.owner === this.owner).length;
                rent = ownerUtilities === 1 ? 4 * rolled : 10 * rolled; // Rent based on dice roll
            }

            player.addSubMoney(true, rent, gameInstance);
            ownerPlayer.addSubMoney(false, rent, gameInstance);

            gameInstance.handlepopup('rent', `Rent Paid ${rent} by Player ${player.id}`, `<div style='display: flex;'>
                <p style="font-size: 4rem;">${player.icon}</p>
                <p style="font-size: 55px;">&#x2192;</p>
                <p style="font-size: 4rem;">${ownerPlayer.icon}</p>
            </div>`);

            return true;
        }
        return false;
    }
}


class SpecialCard {
    constructor(name, position) {
        this.name = name;
        this.position = position;
    }
}

// Define the Player class
class Player {
    constructor(id, icon, color) {
        this.id = id;
        this.icon = icon;
        this.position = 1; // Start position on the board
        this.color = color;
        this.jail = [false, 0];
        this.money = 1000;
        this.cards = [];
        this.bankrupt = false;
    }
    addSubMoney(isAdd, amount, gameInstance) {
        if (!isAdd) {
            this.money += amount;
        } else {
            this.money -= amount;
        }
        gameInstance.displayMoney();
    }

}

// Define the Game class
class Game {
    constructor() {
        this.players = [];
        this.icons = ['♙','♗','♘','♖']; // Example player icons
        this.color = ['red','blue','green','yellow'];
        this.initializeEventListeners();
        this.isRolling = false;
        this.messagePlayer = ["Welcome To Game",'Player num Roll Dice!!',"Click done to end turn","Repay to bank"];
        this.playerIndex = 1;
        this.max_container = 40;
        this.indexChange = 2;
        this.tradeData = [];
        this.properties = [
            new Property('Mediterranean Avenue', 60, 2, 1),
            new Property('Baltic Avenue', 60, 4, 1),
            new Property('Reading Railroad', 200, 6, 0),
            new Property('Oriental Avenue', 100, 7, 2),
            new Property('Vermont Avenue', 100, 9, 2),
            new Property('Connecticut Avenue', 120, 10, 2),
            new Property('St. Charles Place', 140, 12, 3),
            new Property('Electric Company',150, 13, -1),
            new Property('States Avenue', 140, 14, 3),
            new Property('Virginia Avenue', 160, 15, 3),
            new Property('Pennsylvania Railroad', 200, 16, 0),
            new Property('St. James Place', 180, 17, 4),
            new Property('Tennessee Avenue', 180, 19, 4),
            new Property('New York Avenue', 200, 20, 4),
            new Property('Kentucky Avenue', 220, 22, 5),
            new Property('Indiana Avenue', 220, 24, 5),
            new Property('Illinois Avenue', 240, 25, 5),
            new Property('B. & O. Railroad', 200, 26, 0),
            new Property('Atlantic Avenue', 260, 27, 6),
            new Property('Ventnor Avenue', 260, 28, 6),
            new Property('Water Works', 150, 29, -1),
            new Property('Marvin Gardens', 280, 30, 6),
            new Property('Pacific Avenue', 300, 32, 7),
            new Property('North Carolina Avenue', 300, 33, 7),
            new Property('Pennsylvania Avenue', 320, 35, 7),
            new Property('Short Line', 200, 36, 0),
            new Property('Park Place', 350, 38, 8),
            new Property('Boardwalk', 400, 40, 8)
        ];
        this.specialCards = [
            new SpecialCard('Go', 1),
            new SpecialCard('Community Chest', 3),
            new SpecialCard('Income Tax', 5),
            new SpecialCard('Chance', 8),
            new SpecialCard('Just Visiting', 11),
            new SpecialCard('Jail', 45),
            new SpecialCard('Community Chest', 18),
            new SpecialCard('Free Parking', 21),
            new SpecialCard('Chance', 23),
            new SpecialCard('Go to Jail', 31),
            new SpecialCard('Community Chest', 34),
            new SpecialCard('Chance', 37),
            new SpecialCard('Luxury Tax', 39)
        ];

    }

    dynamicEventListenersjail(){
        document.getElementById('payjail').addEventListener('click', this.payjail.bind(this));
        document.getElementById('waitjail').addEventListener('click', this.waitjail.bind(this));
    }
    initializeEventListeners() {
        document.getElementById('sdice').addEventListener('click', this.rollDice.bind(this));
        document.getElementById('buy-card').addEventListener('click', this.buyProperty.bind(this));
        document.getElementById('sell-card').addEventListener('click', this.tradeProperty.bind(this));
        document.getElementById('done').addEventListener('click', this.playerTurn.bind(this));
    }
    // Method to initialize the game
    initializeGame() {
        const numPlayers = prompt("How many players are playing? (2-6)");
        if (numPlayers < 2 || numPlayers > 4 || isNaN(numPlayers)) {
            alert("Please enter a number between 2 and 6.");
            return this.initializeGame();
        }

            for (let i = 1; i <= numPlayers; i++) {
                const icon = this.icons[i - 1];
                const color = this.color[i - 1];
                this.players.push(new Player(i, icon, color));
            }

        this.displayMessage(0);
        this.placePlayerIcons();
        this.displayMoney();
    }
    displayMoney() {
        for (let i = 0; i < this.players.length; i++) {
            let playerMoneyEle = document.getElementById(`value-${i + 1}`);
            playerMoneyEle.innerHTML = this.players[i].money;
        }
    }

    tradeProperty() {
        this.handlepopup('trade','Trade with Players');
        this.initialtrade();
        // setTimeout(() => {
        //     this.tradeEventListenier();
        // }, 2000);
        this.tradeEventListenier();
    }
    //max container = 43;
    playerTurn() {
        this.playerIndex++;
        if(this.players.length+1 == this.playerIndex)
            this.playerIndex = 1;
        if(this.players[this.playerIndex-1].bankrupt){
            this.playerIndex++;
            if(this.playerIndex == this.players.length)
                this.playerIndex = 1;
        }
        let playersbankrupt =this.players.filter(player => player.isBankrupt).length;
        if(this.players.length-1 == playersbankrupt){
            this.handlepopup('gamewon',`Player ${this.players.filter(player => !player.isBankrupt).map(player => player.id)} Won`,'');
        }
        this.displayMessage(1);
        this.isRolling = false;
        let diceEle = document.getElementById('sdice');
        diceEle.style.display = "block";
        let doneEle = document.getElementById('done');
        doneEle.style.display="none";
        let buyEle = document.getElementById('buy-card');
        buyEle.style.display="none";
        let sellEle = document.getElementById('sell-card');
        sellEle.style.display="none";
        this.checkNextPlayerJail();
        this.checkplayermoneyless();
    }
    checkplayermoneyless() {
        let currentPlayer = this.players[this.playerIndex-1];
        if(currentPlayer.money<0){
            this.handlepopup('lessmoney','Repay to Continue','');
            document.getElementById('repaybank').addEventListener('click',() =>{
                this.repaybank();
            });
            document.getElementById('bankruptcy').addEventListener('click',() =>{
                this.bankruptcy();
            })
        }
    }

    repaybank() {
        this.clearpopup();
        this.usermessage(3);
        let repaycheck = setInterval(() => {
            if(this.players[this.playerIndex-1].money>=0){
                usermessage(2);
                clearInterval(repaycheck);
                isRolling = false;
                let diceEle = document.getElementById('sdice');
                diceEle.style.display = "block";
                let doneEle = document.getElementById('done');
                doneEle.style.display="none";
                let buyEle = document.getElementById('buy-card');
                buyEle.style.display="none";
                let sellEle = document.getElementById('sell-card');
                sellEle.style.display="none";
            }
        }, 1000);
    }

    bankruptcy(){
        let currentPlayer = this.players[this.playerIndex-1];
        currentPlayer.bankrupt = true;
        this.properties.forEach(property => {
            if (property.owner === currentPlayer.id) {
                property.owner = null;
            }
        });
        currentPlayer.cards = [];
        this.handlepopup('other',`Player ${currentPlayer.id} Declared Bankruptcy`,'');
        setTimeout(() => {
          clearpopup();
        }, 2000);
      }

    checkNextPlayerJail() {
        //console.log('player index'+this.playerIndex);
        let nextplayer = this.players[this.playerIndex-1];
        if(nextplayer.jail[0]){
            this.handlepopup('jail','You Are In Jail','');
        }
        //console.log('next player jail '+nextPlayer.jail);
    }

    handlejailwait(rolled) {
        //console.log('handle '+this.playerIndex);
        let currentPlayer = this.players[this.playerIndex-1];
        if(!currentPlayer.jail[0] || currentPlayer.jail[1] == 0 ){
           this.movePlayerAnimation(rolled);
           //console.log('checked not in jail'); 
        }
        else{
            if(rolled == 6 ||rolled == 12){
                currentPlayer.jail[0] = false;
                currentPlayer.jail[1] = 0;
                this.handlepopup('other','Lucky','');
                this.movePlayerAnimation(rolled);
            }
            else{
                this.handlepopup('other','UNLUCKY !!!','Try Again');
                this.displayMessage(2);
            }
        }
    }

    payjail() {
        let currentPlayer = this.players[this.playerIndex-1];
        if(currentPlayer.money > 200){
        currentPlayer.jail[0] = false;
        currentPlayer.jail[1] = 0;
        currentPlayer.addSubMoney(true, 200, this);
        this.clearpopup();
        return this.handlepopup('other','Repayed Jail','');
        }
        return this.handlepopup('jail','You are in Jail','');
    }

    waitjail() {
        let currentPlayer = this.players[this.playerIndex-1];
        if(currentPlayer.jail[1] >=3){
            currentPlayer.jail[0] = false;
            currentPlayer.jail[1] = 0;
            currentPlayer.addSubMoney(true, 200, this);
            this.clearpopup();
            this.handlepopup('other','Repayed Jail','Unlucky!!!');
        }
        else{currentPlayer.jail[1]++;
        currentPlayer.jail[0] = true;
        this.clearpopup();
        //console.log(currentPlayer.jail[1]);
    }
    }
    placePlayerIcons() {
        // Get the (possibly newly created) container
        const container = document.getElementById('icon-position-1');
    
        // Loop through each player and add their icon
        for (let i = 0; i < this.players.length; i++) {
            const player = this.players[i];
            const playerIcon = document.createElement('h3');
            const playerId = i + 1; // Player ID starting from 1
            playerIcon.id = `player-icon-${playerId}`;
            playerIcon.style.fontSize = '2.5vw';
            playerIcon.style.color = player.color; // Assuming player has a color property
            playerIcon.innerHTML = player.icon; // Assuming player.icon contains the character
            container.appendChild(playerIcon);
        }
    }

    getPlayerById(playerId) {
        return this.players.find(player => player.id === playerId);
    }

    // Method to display messages to players
    displayMessage(num) {
        let docEle = document.getElementById('game-message');
        let diceEle = document.getElementById('sdice');
        let done = document.getElementById('done');
        if(num == 0){
            setTimeout(() => {
              let upd = this.messagePlayer[num+1].replace('num',this.playerIndex);
          docEle.innerHTML = upd;
            diceEle.style.display = "block";
            }, 3000);
          docEle.innerHTML = this.messagePlayer[num];
          //console.log('welcome message '+"player 1 roll dice")
          }
          else if(num == 1){
          let upd = this.messagePlayer[num].replace('num',this.playerIndex);
          docEle.innerHTML = upd;}
          else if(num == 2){
            setTimeout(() => {
              diceEle.style.display = "none";
              done.style.display="block";
              let buyEle = document.getElementById('buy-card');
            buyEle.style.display="block";
            let sellEle = document.getElementById('sell-card');
            sellEle.style.display="block";
            }, 3000);
            docEle.innerHTML= this.messagePlayer[num];
          }
          else if(num == 3){
              diceEle.style.display = "none";
              done.style.display="none";
              let sellEle = document.getElementById('sell-card');
            sellEle.style.display="block";
              docEle.innerHTML = this.messagePlayer[num];
          }
    }

    rollDice() {
        if (this.isRolling) {
            return; // Prevent multiple clicks while animation is playing
        }
        this.isRolling = true;
        var random1 = Math.floor(Math.random() * 6) + 1; // Generate a random number between 1 and 6
        var random2 = Math.floor(Math.random() * 6) + 1; // Generate a random number between 1 and 6
        var dieSymbol1 = "&#" + (9855 + random1) + ";";
        var dieSymbol2 = "&#" + (9855 + random2) + ";";
        const diceElement= document.getElementById('sdice');
        diceElement.classList.add('fade-in');
        diceElement.innerHTML = dieSymbol1+dieSymbol2;
        setTimeout(() => {
                diceElement.classList.remove('fade-in');
            }, 3000);
        var total = parseInt(random1+random2);
        this.movePlayerAnimation(total);
        //console.log(this.getSpecialCardNameByPosition(3));
        //console.log('rolled '+total+" moving to game loop");
       }

    buyProperty() {
        const currentPlayer = this.players[this.playerIndex - 1];
        const currentPosition = currentPlayer.position;
        const property = this.properties.find(p => p.position === currentPosition);
        //console.log(property);

        if (property && property.buy(currentPlayer, this)) {
            //console.log('bought');
            this.handlepopup('buycard',`Card Bought ${property.name}`,'');
            this.addBuyIcon(property);
            //console.log(currentPlayer.cards);
        } else {
            //console.log('cant buy');
        }
    }

    addBuyIcon(property) {
        if(property.position <= 10){
        const container = document.getElementById("icon-position-" + property.position);
        const playerIconN = document.createElement("div");
        playerIconN.classList.add("playericon-n");
        playerIconN.style.backgroundColor = this.color[property.owner-1];
        container.appendChild(playerIconN);}
        else if(property.position > 10 && property.position <= 20){
            const container = document.getElementById("icon-position-" + property.position);
            const playerIconN = document.createElement("div");
            playerIconN.classList.add("playericon-n");
            playerIconN.style.backgroundColor = this.color[property.owner-1 ];
            playerIconN.style.transform = 'rotate(90deg)';
            playerIconN.style.top = '40%';
            playerIconN.style.left = '93%';
            container.appendChild(playerIconN);
        }
        else if(property.position > 20 && property.position <= 30){
            const container = document.getElementById("icon-position-" + property.position);
            const playerIconN = document.createElement("div");
            playerIconN.classList.add("playericon-n");
            playerIconN.style.backgroundColor = this.color[property.owner-1 ];
            playerIconN.style.transform = 'rotate(180deg)';
            playerIconN.style.top = '100%';
            playerIconN.style.left = '40%';
            container.appendChild(playerIconN);
        }
        else if(property.position > 30 && property.position <= 40){
            const container = document.getElementById("icon-position-" + property.position);
            const playerIconN = document.createElement("div");
            playerIconN.classList.add("playericon-n");
            playerIconN.style.backgroundColor = this.color[property.owner-1 ];
            playerIconN.style.transform = 'rotate(270deg)';
            playerIconN.style.top = '40%';
            playerIconN.style.left = '-16%';
            container.appendChild(playerIconN);
        }
    }

    clearpopup(){
        let popupEle = document.getElementById('popupcontainer');
        popupEle.style.display = "none";
        let heading = document.getElementById('heading-popupcontainer');
        heading.innerHTML="";
        const parentElement = document.getElementById('popup-dynamic');
        parentElement.innerHTML = "";
      }

    handlepopup(type,head,msg){
        //console.log("message "+head);
        let popupEle = document.getElementById('popupcontainer');
        let heading = document.getElementById('heading-popupcontainer');
        let parentElement = document.getElementById('popup-dynamic');
        popupEle.style.display = "block";
      if(type == 'buycard'){
        setTimeout(() => {
          this.clearpopup();
        }, 3000);
        // console.log(cards[players[playerIndex - 1].position]);
        heading.textContent = head;
        // Create the HTML content
      const cardContent = `
          <div class="card" id="card-popup">
              <h4 class="cheading-popup"></h4>
              <div class="line"></div>
              <div class="box-text">
                  <span class="text">Rent</span>
                  <span class="text-Rent-popup"></span>
              </div>
              <div class="house">
                  <span class="house-text">&#127968; - </span>
                  <span class="house-value-1-popup"></span>
              </div>
              <div class="house">
                  <span class="house-text">&#127968;&#127968; - </span>
                  <span class="house-value-2-popup"></span>
              </div>
              <div class="house">
                  <span class="house-text">&#127968;&#127968;&#127968; - </span>
                  <span class="house-value-3-popup"></span>
              </div>
              <div class="box-closecard">
                  <button class="close-cardshow" onclick="closecard()">Close</button>
              </div>
          </div>`;
        // card display set to none
      // Add the card content to the parent element
            parentElement.innerHTML = '';
            // var text = cards[players[playerIndex-1].position][0];
            // console.log(cards[players[playerIndex-1].position][0]);
            // let s = document.getElementById('card-popup');
            // s.style.display='block';
            // var elements = document.querySelector(".cheading-popup");
            // let v=cards[players[playerIndex-1].position][1];
            // console.log(v);
            // elements.textContent=text+' '+'-'+' '+v;
            // var re = document.querySelector(".text-Rent-popup");
            // re.textContent = (v/100)*10;
            // let h1=document.querySelector('.house-value-1-popup');
            // h1.textContent = (v/100)*20;
            // let h2=document.querySelector('.house-value-2-popup');
            // h2.textContent = (v/100)*30;
            // let h3=document.querySelector('.house-value-3-popup');
            // h3.textContent = (v/100)*40;
      }
      else if(type == 'rent'){
        setTimeout(() => {
        this.clearpopup();
        }, 3000);
        heading.textContent= head;
        parentElement.innerHTML = msg;
        //console.log('rent')
      }
      else if(type == 'income tax'|| type== 'chance'||type=='chest'||type == 'club'||type == 'other'){
        setTimeout(() => {
          this.clearpopup();
        }, 3000);
        heading.textContent = head;
        parentElement.innerHTML = msg;
      }
      else if(type == 'jail'){
        heading.textContent=head;
        let cont ='<div style="display: flex;"><button id="payjail">Pay 200</button><button id="waitjail">Wait Until 6</button></div>';
        parentElement.innerHTML = cont;
        this.dynamicEventListenersjail();
      }
      else if(type == 'trade'){
        heading.textContent = head;
        //let selectedplayer = ;
        let tradecont = `    <!-- Trade initiation form -->
      <div id="tradeForm">
          <div class="playerDisplay">
              <button id="prevPlayerBtn" >&lt;</button>
              <span id="currentPlayer"></span>
              <button id="nextPlayerBtn" >&gt;</button>
          </div>
      
          <div class="cardsSection">
              <label for="playerCards">Your cards:</label>
              <select id="playerCards">
                  <!-- Options populated dynamically with player's cards -->
              </select>
          </div>
      
          <div class="cardsSection">
              <label for="requestedCards">Other player's cards:</label>
              <select id="requestedCards">
                  <!-- Options populated dynamically with other player's cards -->
              </select>
          </div>
      
          <div class="moneySection">
              <label for="moneyOffered">Send Money:</label>
              <input type="range" id="moneyOffered" min="0" max="1000" value="0">
              <output for="moneyOffered" id="moneyOfferedValue">0</output>
      
              <label for="moneyRequested">Request Money:</label>
              <input type="range" id="moneyRequested" min="0" max="1000" value="0">
              <output for="moneyRequested" id="moneyRequestedValue">0</output>
          </div>
      
          <button id="submittrade">Initiate Trade</button>
          <button id = "canceltrade">Cancel</button>
      </div>`;
      parentElement.innerHTML = tradecont;
      }
      else if(type == 'tradeoffered'){
        heading.textContent = head;
        let tradeofferedcont = `<div id="tradeOfferDisplay">
              <strong>Offered Cards:</strong>
              <div id="offeredCardsContainer">
                  <!-- Offered cards will be dynamically added here -->
              </div>
              <strong>Requested Cards</strong>
              <div id ="requestedCardsContainer"></div>
          </div>
          <div>
              <strong>Offered Money:</strong> <span id="offeredMoney"></span>
          </div>
          <div>
              <strong>Requested Money:</strong> <span id="requestedMoney"></span>
          </div>
          <button id="acceptBtn">Accept</button>
          <button id="rejectBtn">Reject</button>
      </div>`;
      parentElement.innerHTML = tradeofferedcont;
      }
      else if(type == 'lessmoney'){
        heading.textContent = head;
        let lessmoneycont = `<div><button id="repaybank">Repay</button><button id="bankruptcy">Declare Bankruptcy</button></div>`;
        parentElement.innerHTML = lessmoneycont;
      }
      else if(type == 'gamewon'){
        heading.textContent = head;
        parentElement.innerHTML ='';
      }
      }
      tradeEventListenier() {
        document.getElementById('prevPlayerBtn').addEventListener('click', this.prevPlayer.bind(this));
        document.getElementById('nextPlayerBtn').addEventListener('click', this.nextPlayer.bind(this));
        document.getElementById('canceltrade').addEventListener('click', this.clearpopup.bind(this));
        document.getElementById('submittrade').addEventListener('click', this.submittrade.bind(this));
    }
      prevPlayer(){
        this.indexChange = (this.indexChange === 1) ? this.players.length : this.indexChange - 1;
              if (this.indexChange !== this.playerIndex) {
                  this.initialtrade(this.indexChange);
              }
      }
      nextPlayer(){
        this.indexChange = (this.indexChange === this.players.length) ? 1 : this.indexChange + 1;
              if (this.indexChange !== this.playerIndex) {
                  this.initialtrade(this.indexChange);
              }
      }

      initialtrade(index){
        let maxPlayers = this.players.length;
          if(this.indexChange == this.playerIndex)
          this.indexChange = this.indexChange+1;
          if(this.indexChange == maxPlayers+1 ||this.indexChange<1){
            this.indexChange= 1;
          }
          //console.log('this.indexChange '+this.indexChange);
          document.getElementById('currentPlayer').innerText = this.players[this.indexChange-1].id;
          let playerCardsDropdown = document.getElementById('playerCards');
          playerCardsDropdown.innerHTML = '';
          let emptyOption = document.createElement('option');
          emptyOption.text = "select card";
          emptyOption.value = ""; // Optionally, you can set a value for the empty option
          playerCardsDropdown.add(emptyOption, 0);
          this.players[this.playerIndex - 1].cards.forEach(card => {
          let option = document.createElement('option');
          option.text = card;
          //console.log(this.players[this.playerIndex-1].cards);
          playerCardsDropdown.add(option);
        });
        let tradeWithPlayerCardsDropdown = document.getElementById('requestedCards');
        tradeWithPlayerCardsDropdown.innerHTML = '';
        let empty = document.createElement('option');
        empty.text = "select card";
        empty.value = ""; // Optionally, you can set a value for the empty option
        tradeWithPlayerCardsDropdown.add(empty, 0);
        this.players[this.indexChange - 1].cards.forEach(card => {
          let option = document.createElement('option');
          option.text = card;
          tradeWithPlayerCardsDropdown.add(option);
        });
          document.getElementById('moneyOffered').addEventListener('input', function() {
          document.getElementById('moneyOfferedValue').innerText = this.value;
          document.getElementById('moneyOffered').max = this.players[this.playerIndex-1].money;
          });
          document.getElementById('moneyRequested').addEventListener('input', function() {
          document.getElementById('moneyRequestedValue').innerText = this.value;
           });
           this.tradeData.splice(0, this.tradeData.length);
           this.tradeData.push({
            "offeredto":this.indexChange
           })
        }

        submittrade(){
            let moneyOffered = parseInt(document.getElementById('moneyOffered').value);
              let moneyRequested = parseInt(document.getElementById('moneyRequested').value);
              let offeredCards = [];
              let requestedCards = [];
          
              // Get offered cards
              let selectedCardsDropdown = document.getElementById('playerCards');
              for (let option of selectedCardsDropdown.options) {
                  if (option.selected) {
                      offeredCards.push(option.text);
                  }
              }
          
              // Get requested cards
              let requestedCardsDropdown = document.getElementById('requestedCards');
              for (let option of requestedCardsDropdown.options) {
                  if (option.selected) {
                      requestedCards.push(option.text);
                  }
              }
          
              // Push all data into the tradeData array
              //console.log(offeredCards+" "+requestedCards);
              if(offeredCards != "select card" || requestedCards != "select card"){
              this.tradeData.push({
                  "offeredCards": offeredCards,
                  "requestedCards": requestedCards,
                  "moneyOffered": moneyOffered,
                  "moneyRequested": moneyRequested
              });
              setTimeout(() => {
                this.tradeoffered();
              }, 2000);}
              else{
                alert('Trade is invalid');
              }
              this.clearpopup();
          }

          tradeoffered() {
            this.handlepopup('tradeoffered', 'Trade Offer');
            //console.log(this.tradeData);
    
            let offeredCardsContainer = document.getElementById('offeredCardsContainer');
            offeredCardsContainer.innerHTML = '';
    
            let validOfferedCards = this.tradeData[1].offeredCards.filter(card => card !== "select card");
    
            if (validOfferedCards.length > 0) {
                validOfferedCards.forEach(card => {
                    let cardElement = document.createElement('div');
                    cardElement.textContent = card;
                    offeredCardsContainer.appendChild(cardElement);
                });
            } else {
                let messageElement = document.createElement('div');
                messageElement.textContent = "No cards offered.";
                offeredCardsContainer.appendChild(messageElement);
            }
    
            let requestedCardsContainer = document.getElementById('requestedCardsContainer');
            requestedCardsContainer.innerHTML = '';
    
            let validRequestedCards = this.tradeData[1].requestedCards.filter(card => card !== "select card");
    
            if (validRequestedCards.length > 0) {
                validRequestedCards.forEach(card => {
                    let cardElement = document.createElement('div');
                    cardElement.textContent = card;
                    requestedCardsContainer.appendChild(cardElement);
                });
            } else {
                let messageElement = document.createElement('div');
                messageElement.textContent = "No cards requested.";
                requestedCardsContainer.appendChild(messageElement);
            }
    
            document.getElementById('offeredMoney').innerText = this.tradeData[1].moneyOffered;
            document.getElementById('requestedMoney').innerText = this.tradeData[1].moneyRequested;
    
            document.getElementById('acceptBtn').addEventListener('click', () => {
                //console.log(this.tradeData);
                let validOfferedCards = this.tradeData[1].offeredCards.filter(card => card !== "select card");
                let validRequestedCards = this.tradeData[1].requestedCards.filter(card => card !== "select card");
    
                if (validOfferedCards.length > 0) {
                    //console.log('offered' + validOfferedCards);
                    this.deleteCardFromPlayer(this.playerIndex - 1, validOfferedCards);
                    validOfferedCards.forEach(cardName => {
                        let card = this.getCardByName(cardName);
                        if (card) {
                            card.owner = this.tradeData[0].offeredto;
                            this.players[this.tradeData[0].offeredto - 1].cards.push(card);
                        }
                    });
                }
                if (validRequestedCards.length > 0) {
                    //console.log('requested' + validRequestedCards);
                    validRequestedCards.forEach(cardName => {
                        let card = this.getCardByName(cardName);
                        if (card) {
                            card.owner = this.playerIndex; // Update the owner to the current player
                            this.players[this.playerIndex - 1].cards.push(card);
                        }
                    });
                    this.deleteCardFromPlayer(parseInt(this.tradeData[0].offeredto) - 1, validRequestedCards);
                }
    
                // Update player's money by subtracting the requested money and adding the offered money
                if (this.tradeData[1].moneyOffered) {
                    this.players[this.tradeData[0].offeredto - 1].addSubMoney(false, this.tradeData[1].moneyOffered, this);
                    this.players[this.playerIndex - 1].addSubMoney(true, this.tradeData[1].moneyOffered, this);
                }
                if (this.tradeData[1].moneyRequested) {
                    this.players[this.tradeData[0].offeredto - 1].addSubMoney(true, this.tradeData[1].moneyRequested, this);
                    this.players[this.playerIndex - 1].addSubMoney(false, this.tradeData[1].moneyRequested, this);
                }
                // Assuming tradeData contains information about the trade and updated ownership
                this.tradeData[1].offeredCards.forEach(cardName => {
                    const card = this.getCardByName(cardName); // Assuming you have a function to retrieve card object by name
                    if (card) {
                        this.addBuyIcon(card);
                        // console.log('updated offered');
                    }
                });
                this.tradeData[1].requestedCards.forEach(cardName => {
                    const card = this.getCardByName(cardName); // Assuming you have a function to retrieve card object by name
                    if (card) {
                        this.addBuyIcon(card);
                        // console.log('upated icon requested');
                    }
                });

                this.clearpopup();
            });
    
            document.getElementById('rejectBtn').addEventListener('click', () => {
                this.tradeData = [];
                // console.log('cleared ' + this.tradeData);
                this.clearpopup();
            });
            // this.players.forEach(player => {
            //      console.log(`Player ${player.id} cards:`, player.cards);
            // });
        }
        deleteCardFromPlayer(playerId, card) {
            const playerCards = this.players[playerId].cards;
            //console.log(playerCards);
            for (let i = 0; i < playerCards.length; i++) {
                if (playerCards[i] == card) {
                    playerCards.splice(i, 1); // Remove the card from the player's cards array
                    let property = this.properties.find(property => property.card === card && property.owner === playerId);
                    if (property) {
                        property.owner = null;
                    }
                    break; // Exit the loop once the card is found and removed
                }
            }
        }

        getCardByName(cardName) {
            for (const property of this.properties) {
                if (String(property.name) === String(cardName)) {
                    //console.log("Card found:", property);
                    return property;
                }
            }
            //console.log("Card not found.");
            return null; // Return null if card name is not found
        }

    changeposition(newpos, total) {
        //console.log('changing to ' + newpos);
        const currentPlayer = this.players[this.playerIndex - 1];
        const prevpos = currentPlayer.position;
    
        if (newpos < prevpos) {
            //console.log('crossing GO');
            //handle if jail
            currentPlayer.addSubMoney(false, 200, this); // Adding $200 for crossing GO
        }
    
        // Remove the element with the ID 'player-icon-{playerIndex}'
        const playerIconElement = document.getElementById(`player-icon-${this.playerIndex}`);
        if (playerIconElement) {
            playerIconElement.remove();
        }
    
        // Create a new player icon and add it to the new position
        const playerIcon = document.createElement('h3');
        playerIcon.id = `player-icon-${this.playerIndex}`;
        playerIcon.style.fontSize = '2.5vw';
        playerIcon.style.color = currentPlayer.color;
        playerIcon.innerHTML = currentPlayer.icon;
    
        const nextPosElement = document.getElementById(`icon-position-${newpos}`);
        nextPosElement.appendChild(playerIcon);

        currentPlayer.position = newpos;
        const splcard = this.getSpecialCardNameByPosition(newpos);
    
        if (splcard === 'Card not found') {
            //console.log('check rent');
            const property = this.properties.find(prop => prop.position === newpos);
            if (property.owner !== this.players[this.playerIndex-1].id)
                property.payRent(this.players[this.playerIndex-1], this, total);
        } else {
            this.handleSpecialCard(splcard, total);
        }
    }
    
    movePlayerAnimation(total) {
        //console.log("ani");
  const prevPosition = this.players[this.playerIndex - 1].position;
  let newPosition = 0;
  if(prevPosition == 45 && this.players[this.playerIndex-1].jail[0]){
    //console.log('sent to handlejaol'+this.players[this.playerIndex-1].jail[0]);
    this.handlejailwait(total);
  }
  else{
    if(prevPosition+total > this.max_container){
      // this.players[playerIndex-1].position = this.players[playerIndex-1].position+total - max_container;
      if(prevPosition == 45){
        newPosition = 10+total;
      }
      else{
      newPosition = prevPosition+total - this.max_container;
      this.players[this.playerIndex-1].addSubMoney(false, 200, this);
      this.handlepopup('other','Salary 200 🤑🤑🤑','');}
    }
    else{
      newPosition = prevPosition + total;
    }
  
var steps = newPosition - prevPosition;

// console.log(prevPosElement);
var nextPosElement = document.getElementById(`icon-position-${newPosition}`);
var playerIconElement = document.getElementById(`player-icon-${this.playerIndex}`);
const jumpCount = 5; // Number of jumps
const jumpHeight = 20; // Height of each jump

for (let i = 1; i <= steps; i++) {
 
    setTimeout(() => {
      
        let nextBoxNumber = prevPosition + i;
        let nextBox = document.getElementById(`icon-position-${nextBoxNumber}`);
        let nextBoxPosition = nextBox.getBoundingClientRect();
        let currentBoxPosition = document.getElementById(`icon-position-${prevPosition}`).getBoundingClientRect();
        
        let offsetX = nextBoxPosition.left - currentBoxPosition.left;
        let offsetY = nextBoxPosition.top - currentBoxPosition.top;
        
        playerIconElement.style.transform = `translate(${offsetX}px, ${offsetY}px) translateY(-${jumpHeight}px)`;
    }, i * 200);

}

setTimeout(() => {
    // Get all div elements with class 'player-icon-${playerIndex}' inside prevPosElement
    const playerIconElements = document.getElementById(`player-icon-${this.playerIndex}`);
    
    // Remove each div element with class 'player-icon-${this.playerIndex}'
    playerIconElements.parentNode.removeChild(playerIconElements);

    const playerIcon = document.createElement('h3');
     // Player ID starting from 1
    playerIcon.id = `player-icon-${this.playerIndex}`;
    playerIcon.style.fontSize = '2.5vw';
    playerIcon.style.color = this.players[this.playerIndex-1].color; // Assuming player has a color property
    playerIcon.innerHTML = this.players[this.playerIndex-1].icon; // Assuming player.icon contains the character
    nextPosElement.appendChild(playerIcon);
    //console.log(nextPosElement);
    this.players[this.playerIndex - 1].position = newPosition;
    let splcard = this.getSpecialCardNameByPosition(newPosition);
    //console.log(splcard);
    if(splcard == 'Card not found'){
        //console.log('check rent');
        const property = this.properties.find(prop => prop.position === newPosition);
        if (property.owner !== this.players[this.playerIndex-1].id)
            property.payRent(this.players[this.playerIndex-1], this, total);
    }else{
    //console.log('rolled '+total);
    this.handleSpecialCard(splcard, total); 
}
}, (steps + jumpCount) * 200); // Total animation duration
  }
  this.displayMessage(2);
}

getSpecialCardNameByPosition(position) {
    for (let card of this.specialCards) {
        if (card.position === position) {
            return card.name.toLowerCase();
        }
    }
    return 'Card not found';
}

splbirthday() {
    const currentPlayer = this.players[this.playerIndex - 1];
    const amountPerPlayer = 20;
    const totalAmount = this.players.length * amountPerPlayer;

    currentPlayer.addSubMoney(false, totalAmount, this);

    this.players.forEach(player => {
        if (player !== currentPlayer) {
            player.addSubMoney(true, amountPerPlayer, this);
        }
    });
}


handleSpecialCard(name, rolled) {
    //console.log(name);
    let currentPlayer = this.players[this.playerIndex-1];
    const specialActions = {
        'chance': {
            2: () => [this.changeposition(45, rolled), /*this.handlepopup('chance', "Sent to Jail", "Crime")*/],
            3: () => [this.movePlayerAnimation(3, rolled), this.handlepopup('chance', 'Moving 3 Forward', "")],
            4: () => [currentPlayer.addSubMoney(true, 100, this), this.handlepopup('chance', 'School fee Paid $100', "")],
            5: () => [this.changeposition(45), /*this.handlepopup('chance', 'Sent to Jail', 'Kidnap')*/],
            6: () => [currentPlayer.addSubMoney(false, 100, this), this.handlepopup('chance', 'You got Refund $100', "Bank Error")],
            7: () => [this.changeposition(20), this.handlepopup('chance', 'Chance to Visit New York', '')],
            8: () => [currentPlayer.addSubMoney(true, 200, this), this.handlepopup('chance', 'Electric City Bill Paid $200')],
            9: () => this.handlepopup('chance', "Bank Error", 'Refund not Processed'),
            10: () => [currentPlayer.addSubMoney(false, 100, this), this.handlepopup('chance', 'Your property value increased', 'You are safe')],
            11: () => [currentPlayer.addSubMoney(false, 200, this), this.handlepopup('chance', 'You received Gift', '$200')],
            12: () => [currentPlayer.addSubMoney(false, 100, this), this.handlepopup('chance', 'Bank Paid Interest $50', '')]
        },
        'community chest': {
            2: () => [this.changeposition(28, rolled), this.handlepopup('chest', 'You are Visiting Ventor avenue', '')],
            3: () => [currentPlayer.addSubMoney(true, 150, this), this.handlepopup('chest', 'Your Computer Damaged', 'Repair charges $150')],
            4: () => [this.changeposition(45), /*this.handlepopup('chest', 'Sent to Jail', 'Selling Illegal Items')*/],
            5: () => [this.movePlayerAnimation(6), this.handlepopup('chest', 'Moving six Steps Ahead', '')],
            6: () => [this.splbirthday(),this.handlepopup('chest','Its Your Birthday','Collect 20 From Each Player')],
            7: () => [currentPlayer.addSubMoney(true, 50, this), this.handlepopup('chest', 'Doctor Visiting fee $50', '')],
            8: () => this.handlepopup('chest', 'Nothing Special', ''),
            9: () => [this.changeposition(1), this.handlepopup('chest', 'Advance to GO', '')],
            10: () => [currentPlayer.addSubMoney(false, 100, this), this.handlepopup('chest', 'Income Tax House raid', 'per Each house pay 25 and Each Hotel pay 50')],
            11: () => [currentPlayer.addSubMoney(false, 100, this), this.handlepopup('chest', 'Income Tax House raid', 'per Each house pay 25 and Each Hotel pay 50')],
            12: () => [this.movePlayerAnimation(4), this.handlepopup('chest', 'Moving Four Steps', '')]
        },
        'jail': [
            () => [this.handlepopup('jail','sent to jail','')]
        ],
        'income tax': [
            () => currentPlayer.addSubMoney(true, 200, this),
            () => this.handlepopup('income tax', 'Paid Income Tax $200', '')
        ],
        'free parking': [
            () => this.handlepopup('other', 'Visiting Free Parking', '')
        ],
        'electric company': [
            () => this.handlepopup('electric company', 'Landed on Electric Company', '')
        ],
        'water works': [
            () => this.handlepopup('water works', 'Landed on Water Works', '')
        ],
        'go': [
            () => this.handlepopup('go', 'Landed on GO', 'Collect $200')
        ],
        'go to jail': [
            // () => this.handlepopup('go to jail', 'Go to Jail', 'Do not pass GO, do not collect $200'),
            () => this.changeposition(45) // Position of Jail
        ],
        'luxury tax': [
            () => currentPlayer.addSubMoney(true, 75, this),
            () => this.handlepopup('luxury tax', 'Paid Luxury Tax $75', '')
        ],
        'just visiting': [
            () => this.handlepopup('other','Just Visiting Jail','')
        ]
    };

    if (specialActions[name]) {
        if (Array.isArray(specialActions[name])) {
            specialActions[name].forEach(action => action());
        } else if (specialActions[name][rolled]) {
            specialActions[name][rolled]();
        }
    } else {
        console.log('Unhandled special card name:', name);
    }
}


}




// Instantiate and initialize the game
const monopolyGame = new Game();
monopolyGame.initializeGame();

document.addEventListener("DOMContentLoaded", function () {
    let rotateEle = document.getElementById("rotate-message-id");
    let responEle = document.getElementById("responsive-id");
    let usercontrolEle = document.getElementById("controls-container-id");

    function checkOrientation() {
      if (window.innerWidth > window.innerHeight) {
        // Landscape orientation
        rotateEle.style.display = 'none';
        responEle.style.display = 'block';
        usercontrolEle.style.display = 'flex';
        // console.log("Landscape mode");
      } else {
        // Portrait orientation
        rotateEle.style.display = 'block';
        responEle.style.display = 'none';
        usercontrolEle.style.display = 'none';
        // console.log("Portrait mode");
      }
      // Print display properties to console
    //   console.log("rotateEle display: ", rotateEle.style.display);
    //   console.log("responEle display: ", responEle.style.display);
    //   console.log("usercontrolEle display: ", usercontrolEle.style.display);
     }

    // Initial check
    checkOrientation();

    // Listen for resize events to detect orientation changes
    window.addEventListener("resize", checkOrientation);
  });
