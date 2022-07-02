// IMPORTS


var express = require('express');
var app = express();
var axios = require('axios');
var fs = require('fs');
// var stream = require('stream');
var streamifier = require('streamifier');
var request = require('request');
var http = require('http');
var https = require('https');
var config = require('./config');
var bodyParser = require('body-parser');
// var path = require('path');
var multer  = require('multer');
var url = require('url');
var FormData = require('form-data');
const { json } = require('body-parser');





// mutler function to upload image to ms and get faceid
var storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, './uploads');
    },
    filename: function (req, file, cb) {
        cb(null , file.originalname);
    }
}),

  upload = multer({ storage: storage });







// GLOBAL MIDDLEWARE
app.use(express.static('public'));
// app.use(bodyParser.json());
// app.use(bodyParser.urlencoded({extended: true}));
app.use(function(req, res, next){
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, x-access-token');

    // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
      res.sendStatus(200);
    }
    else {
      next();
    }
});



// MS API FUNCTIONS
/**
 * Call MS face detection
 *
 * @param {*} imageData image as dataURL
 * @param {*} onSuccess success callback
 * @param {*} onError error callback
 */
 function callMsDetect(imageData, onSuccess) {
    var msDetectOptions = {

        host: 'helpmefaceauth.cognitiveservices.azure.com',
        method: 'POST',
        port: 443,
        path: '/face/v1.0/detect?returnFaceId=true&recognitionModel=recognition_01&returnRecognitionModel=false&detectionModel=detection_01&overlaod=stream',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(imageData),
            'Ocp-Apim-Subscription-Key': config.FACE_API_KEY
        }
    };

    var msDetectReq = https.request(msDetectOptions, function(msDetectResponse) {
        msDetectResponse.setEncoding('utf8');
        msDetectResponse.on('data', (msDetectData) => {
                onSuccess(JSON.parse(msDetectData));
            });
    });

    msDetectReq.on('error', error => {
        console.error(error);
      });
    msDetectReq.write(imageData);
    msDetectReq.end();


}

// function callMsDetect(imageData, onSuccess) {

//     axios.post('https://helpmefaceauth.cognitiveservices.azure.com/face/v1.0/detect?returnFaceId=true&recognitionModel=recognition_01&returnRecognitionModel=false&detectionModel=detection_01&overlaod=stream',
//     { 
//         headers: {'Content-Type': 'application/json',
//          'Content-Length': Buffer.byteLength(imageData),
//          'Ocp-Apim-Subscription-Key': config.FACE_API_KEY
//         }
//         "url": imageData
//     }).then(({ data }) => { res.json(data);
//         console.log(data);

//     }
//     )
// }



/**
 *
 * @param {*} faceId1 face1 to compare
 * @param {*} faceId2 face2 to compare
 * @param {*} onSuccess success callback
 * @param {*} onError error callback
 */
function callMsCompare(faceId_profile, faceId2, onSuccess, onError) {
    var msVerifyOptions = {
        host: 'helpmefaceauth.cognitiveservices.azure.com',
        method: 'POST',
        port: 443,
        path: '/face/v1.0//face/v1.0/verify?recognitionModel=recognition_01&returnRecognitionModel=false',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(imageData),
            'Ocp-Apim-Subscription-Key': config.FACE_API_KEY

        }
    }

    var msVerifyReq = https.request(msVerifyOptions, function(msVerifyResponse) {
         msVerifyResponse.setEncoding('utf8');
         msVerifyResponse.on('data', function(msVerifyData) {
         onSuccess(JSON.parse(msVerifyData));
         });
    })

    msVerifyReq.on('error', error => {
        console.error(error);
      });
    msVerifyReq.write(JSON.stringify({faceId: faceId1, personId: faceId2}));
    msVerifyReq.end();
}



/**
 * 
 *
 * @param {*} faceId_profile porfile picture ID 
 * @param {*} id user ID
 */

 function savetodb(savefaceId_profile, userid) {

    axios.post('http://finalmohamed-001-site1.itempurl.com/api/FaceRec/Insert', {
        "FacID": savefaceId_profile
        ,"VolunteerId": userid

    }). then(res => {
        console.log(`statusCode: ${res.status}`);
        console.log(res);
        

    }).catch(error => {
     
     console.error(error);
x
    });



}

// Load user Faceid from database Function
/**
 * 
 *
 * @param {*} faceId_profile porfile picture ID 
 * @param {*} id user id
 */
 function loadfaceid(loadedfaceid1, idforcompare) {

    axios.get('http://finalmohamed-001-site1.itempurl.com/api/FaceRec/GetById/' + idforcompare , {

     data: loadedfaceid1

    })
    .then(({ data }) => { res.json({ FacID : data  } );
        console.log(data);
    })
    .then(res => {
      console.log(`statusCode: ${res.status}`);
      console.log(res);
    }) .catch(error => {    console.error(error);  } );
 

 }

// PUBLIC API ENDPOINTS

// Face Authentication endpoint
app.post('/faceauth'   ,upload.single("image")  ,function(req, res){ 

    // var getid = req.body.id;
    var reqimage;

    // get image user faceid from database
    /* loadfaceid(idfromdb, getid) */
     

        
    // if no image is sent, send 400;
    if(!req.file) {
        res.statusCode = 400;
        res.json({'message': 'image is required'});
        return;
    }

    // get image as binary data, so it can be sent to MS
    if(req.file) {
        reqimage = req.file.buffer.toString('base64');
 
        if (reqimage) {
                // detect faces on the login image
                callMsDetect(reqimage,
                    function(msDetectData) {
                        // TODO: send error when more than one face is recognized and let the user pick one
                        if(msDetectData.length === 1){
                            profile_personid = msDetectData[0].faceId ;
                            // idfromdb  = "cafe37fb-a511-4022-9020-564897378ead",
                            // profile_personid = "23a20d76-9b8f-4469-abf9-1e2cab2c4295",
                            // compare the recognized face to the saved one
                            callMsCompare(idfromdb, profile_faceid,
                                function(msCompareData){
                                    if(msCompareData.isIdentical && msCompareData.confidence >= config.FACE_API_CONFIDENCE_TRESHOLD){
                                    

                                        res.json({
                                            message: 'Face Authentication succesful',
                                        });
                                    }
                                    else {
                                        // if faces do not match, send 403
                                        res.statusCode = 403;
                                        res.json({'message': 'image login failed - face could not be verified'});
                                    }
                                },
                                function(error){
                                    // if an error occurs during the compare, send 500
                                    res.statusCode = 500;
                                    res.json({'message': 'image login failed - face compare failed'});
                                });
                        }
                        else {
                            // if no face can be recognized on the login image, send 400
                            res.statusCode = 400;
                            res.json({'message': 'image login failed - no face recognized'});
                        }
                    },
                    function(error) {
                        // if an error occurs during the detection, send 500
                        res.statusCode = 500;
                        res.json({'message':'face detection failed'});
                    });
            }
            else {
                // if no valid image data is given, send error
                res.statusCode = 400;
                res.json({message: 'face photo is required'});
            }
        
        }
});

// Save Profile Picture Face Id to database endpoint         
app.post('/profilepic',  upload.single("image"),   function(req, res){

    // var  reqid = req.body.id,
    // var  reqid = 1,
    const imageurl = url.pathToFileURL(req.file.path)
    console.log("test////////////////" + imageurl   + "//////////////////////////////");

    callMsDetect(imageurl,
        function(msDetectData) {
            var faceMessage = '';
            // face will only be saved if only one face is recognized
            // if no face or more than one face is recognized, the user will be informed
            if(msDetectData === 1){
                profile_faceid = msDetectData.faceId ;
                faceMessage = 'Face detected and saved';   
            }  
            else if(!msDetectData.length){

                faceMessage = 'No face was recognized.'
             }
            else {
                faceMessage = 'More than one face was recognized.'
            }


            res.json({

                message: 'FaceId was created ' + faceMessage,
                        
                    });

                 
                  });

                  

                //   savetodb(profile_faceid,reqid);
                  
                


            
});
         
// app.post('/comparetest'   ,upload.single("image")   ,(req, res) => {

//     const imageurl = url.pathToFileURL(req.file.path)
//     console.log("test" + imageurl);



//     // const r = fs.createReadStream(req.file.buffer) // or any other way to get a readable stream
//     // const ps = new stream.PassThrough() // <---- this makes a trick with stream error handling

            
//     });
            


            


// start server     
var server = app.listen(6060, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log("Example app listening at http://%s:%s", host, port);
})
