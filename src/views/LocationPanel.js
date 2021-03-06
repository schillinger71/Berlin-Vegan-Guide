
BVApp.views.LocationPanel = Ext.extend(Ext.Panel,{

    /**
     * @private
     */
    toolbar: null,
    switcherToolbar: null,
    switcherSegmentedButton: null,
    descriptionPanel: null,
    detailsPanel:null,
    mapPanel:null,
    descriptionButton: null,
    detailsButton:null,
    mapButton:null,
    currentRestaurant:null,
    needsMapRefresh:true,

    initComponent: function () {
        this.descriptionPanel = new BVApp.views.LocationDescriptionPanel();
        this.detailsPanel = new BVApp.views.LocationDetailsPanel();
        //TODO
        /*Ext.EventManager.addEventListener("telbutton","click",function(){
            BVApp.utils.AppUtils.dialTelNumber("00303");
        });*/
        var toolBarItems = [];
        if(!BVApp.utils.AppUtils.isAndroid()){ // add back button on non android platforms
            toolBarItems.push({
                text: BVApp.Main.getLangString("Back"),
                ui: 'back',
                handler: this.doBack,
                scope: this
            });
        }
        toolBarItems.push({
                xtype: "spacer"
        });
        toolBarItems.push({
            iconMask: true,
            iconCls: 'action',
            handler: this.doAction,
            scope:this
        });

        this.toolbar = new Ext.Toolbar({
            dock: 'top',
            items: toolBarItems
        });
        this.descriptionButton = new Ext.Button({
            scope:this,
            pressed: true,
            text: BVApp.Main.getLangString("Description"),
            handler: this.descriptionButtonClicked
        });
        this.detailsButton = new Ext.Button({
            scope:this,
            text   : '&nbsp;&nbsp;&nbsp;' + BVApp.Main.getLangString("Details") +'&nbsp;&nbsp;&nbsp;',
            handler: this.detailsButtonClicked
        });

        this.switcherSegmentedButton = new Ext.SegmentedButton({
            allowMultiple: false,
            items: [this.descriptionButton,this.detailsButton]
        });
        
        if(typeof google !== "undefined"){
            this.mapPanel = new BVApp.views.LocationMapPanel();
            this.mapButton = new Ext.Button({
                scope:this,
                text   : '&nbsp;&nbsp;'+BVApp.Main.getLangString("Map")+'&nbsp;&nbsp;&nbsp;&nbsp;',
                handler: this.mapButtonClicked
            });
            this.switcherSegmentedButton.add(this.mapButton);
        }
        this.switcherToolbar = new Ext.Toolbar({
            dock: 'bottom',
            items: [this.switcherSegmentedButton],
            layout: {
                type: 'hbox',
                pack: 'center'
            }
        });
        Ext.apply(this, {
            autoDestroy: true,
            layout: "card",
            items: [this.descriptionPanel,this.detailsPanel],
            dockedItems: [this.toolbar,this.switcherToolbar],
            cardSwitchAnimation: false
        });
        BVApp.views.LocationPanel.superclass.initComponent.call(this);
    },
    constructor: function (a) {
        this.addEvents("back");
        BVApp.views.LocationPanel.superclass.constructor.call(this, a)
    },
    doBack: function(button,event){
        this.fireEvent("back");
    },
    doAction: function(button,event){
        var s = new BVApp.views.LocationActionSheet({
            currentRestaurant: this.currentRestaurant
        });
        s.show();
    },

    /**
     *
     * @param restaurant Ext.Data.Model
     */
    updateRestaurant: function(restaurant){
        this.currentRestaurant = restaurant;
        this.needsMapRefresh =true;
        this.toolbar.setTitle(Ext.util.Format.ellipsis(restaurant.get("name"),BVApp.Main.maxToolbarLetters));
        this.descriptionPanel.update({text: ""}); // delete before ajax call
        var openTimes = this.getOpenTimesData(restaurant);

        var detailData = Ext.apply({},restaurant.data,{
            currentLat: BVApp.utils.CurrentGeoPosition.latitude,
            currentLong: BVApp.utils.CurrentGeoPosition.longitude,
            openTimes: openTimes
        });

        this.detailsPanel.update(detailData);
        if(this.descriptionButton.el !== undefined){ // beim ersten mal noch nicht gerendert, so kein el vorhanden
            this.switcherSegmentedButton.setPressed(this.descriptionButton,true,true);
            this.setActiveItem(this.descriptionPanel);
        }
        if(restaurant.get("nameID") !== ""){
            var file = 'reviews/' + BVApp.utils.Settings.language +"/" + restaurant.get("nameID")+'.html';
            var fileDE = 'reviews/de/' + restaurant.get("nameID")+'.html';
            var me = this.descriptionPanel;
            BVApp.utils.AppUtils.loadFile(file,function(result){
                if(result === "" || result === undefined){ // file not found, try the german as backup
                    BVApp.utils.AppUtils.loadFile(fileDE,function(result){
                        me.update({
                            text: "<b>" + BVApp.Main.getLangString("TranslationNotAvailable","en") + "</b><br/><br/>" + result
                        });
                    });
                }
                else{
                    me.update({
                        text: result
                    });
                }
            });
            /*
            Ext.Ajax.request({
                url: 'resources/data/reviews/' + BVApp.utils.Settings.language +"/" + restaurant.get("nameID")+'.html',
                scope:this,
                success: function(response, opts) {
                    this.descriptionPanel.update({
                        text: response.responseText
                    });
                },
                failure: function(response, opts) {
                    console.log('server-side failure with status code ' + response.status);
                    this.descriptionPanel.update({
                        text: response.responseText
                    });
                }
            });
*/
        }

    },
    /** returns an Array with calculate open times, including translation
     * [{
            day: "Mo-Di",
            time:"20 - 12 Uhr"
        },{
            day: "Mi-Do",
            time:"20 - 12 Uhr"
        }];
     * @param restaurant Restaurant Record
     */
    getOpenTimesData: function(restaurant){
        var resultArray = new Array();
        var openNames = [
            BVApp.Main.getLangString("DetailsMo"),
            BVApp.Main.getLangString("DetailsTues"),
            BVApp.Main.getLangString("DetailsWed"),
            BVApp.Main.getLangString("DetailsThur"),
            BVApp.Main.getLangString("DetailsFri"),
            BVApp.Main.getLangString("DetailsSat"),
            BVApp.Main.getLangString("DetailsSun")
        ];
        var openTimes = [restaurant.get("mo"),restaurant.get("tues"),restaurant.get("wed"),
            restaurant.get("thur"),restaurant.get("fri"),restaurant.get("sat"),restaurant.get("sun")
        ];

        var equalStart=-1;
            for ( var i = 0; i <= 6; i++) {

                if(openTimes[i] === openTimes[i+1]){ // nachfolger identisch,mach weiter
                    if(equalStart == -1){
                        equalStart = i;
                    }

                }else{
                    if(equalStart === -1){ // aktueller Tag ist einmalig
                        if(openTimes[i] === ""){  // geschlossen
                            resultArray.push({
                                day: openNames[i],
                                time: BVApp.Main.getLangString("DetailsClosed")
                            });

                        }else{
                            resultArray.push({
                                day: openNames[i],
                                time: openTimes[i] + " " + BVApp.Main.getLangString("DetailsOClock")
                            });
                        }

                    }else{// es gibt zusammenhängende Tage
                        if(openTimes[i] ===""){
                            resultArray.push({
                                day: openNames[equalStart] + "-" +openNames[i],
                                time: BVApp.Main.getLangString("DetailsClosed")
                            });
                        }else{
                             resultArray.push({
                                day: openNames[equalStart] + "-" + openNames[i],
                                time: openTimes[i] + " " + BVApp.Main.getLangString("DetailsOClock")
                            });
                        }
                        equalStart=-1;
                    }
                }
            }
        return resultArray;
    },
    descriptionButtonClicked: function(button,event){
        this.setActiveItem(this.descriptionPanel);
    },
    detailsButtonClicked: function(button,event){
        this.setActiveItem(this.detailsPanel);
    },
    mapButtonClicked: function(button,event){
        this.setActiveItem(this.mapPanel);
        if(this.needsMapRefresh){
            this.mapPanel.showRoute(
                    BVApp.utils.CurrentGeoPosition.latitude,
                    BVApp.utils.CurrentGeoPosition.longitude,
                    this.currentRestaurant.get("lat"),
                    this.currentRestaurant.get("long")
                    );
            this.needsMapRefresh=false;
        }

    }
});