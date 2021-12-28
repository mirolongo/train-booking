const express = require('express');
const webServer = express();
webServer.use(express.static('frontend'));
webServer.use(express.json());
webServer.listen(4000,() => console.log('Listening on port 4000'));
const driver = require('better-sqlite3');
const { request } = require('http');
const db = driver('./train.sqlite3.txt');




let preparedStatement = db.prepare(`
  SELECT 
      name, type
  FROM 
      sqlite_schema
  WHERE 
      (type ='table' OR type = 'view')
      AND 
      name NOT LIKE 'sqlite_%';
`)
let tablesInDb = []
let viewsInDb = []
let result = preparedStatement.all();
for(table of result){
  if(table.type === 'table'){
    tablesInDb.push(table.name)
  }else if(table.type === 'view'){
    viewsInDb.push(table.name)
  }
}

webServer.get('/api/', (request, response) => {
 let preStm = db.prepare(
    `SELECT user.username as passager, seat.seat_number as seat_indentification,station.name as from_station, station.name as to_station,
    departure_arrival.departure_date as departure,
    departure_arrival.arrival_date as arrival,booking.number_of_tickets, departure_arrival.departure_time as time_departure,
    departure_arrival.arrival_time as time_arrival,
    ticket.price as price, booking.booking_number as book_number FROM user, seat,itinerary,departure_arrival, ticket,booking, station
     WHERE user.id = booking.user_id group by passager;`
)
result = preStm.all();
response.json(result)
});


webServer.get('/api/:table', (request, response) =>{
    if( !tablesInDb.includes(request.params.table) && !viewsInDb.includes(request.params.table) ){    
        return response.json({error: "no such table in the database"});
      }
      let preparedStatement = db.prepare(
          `SELECT * 
          FROM ${request.params.table}
      `)
      let result = preparedStatement.all();
      response.json(result);
});


webServer.post('/api/:table', (request, response) =>{
    if(!tablesInDb.includes(request.params.table)){    
        return response.json({error: "no such table in the database"});
      }
      let columnNames = Object.keys(request.body) 
      let columnParameters = Object.keys(request.body).map(colName => ':' + colName) 
    
      let query = `
        INSERT INTO ${request.params.table}
          (${columnNames})         
          VALUES(${columnParameters})`
      let preparedStatement = db.prepare(query)
      let result = preparedStatement.run(request.body);
      response.json(result);

})

webServer.put('/api/:table/:id', (request, response) => {
    if(!tablesInDb.includes(request.params.table)){    
        return response.json({error: "no such table in the database"});
      }
      let setQuery = Object.keys(request.body).map( colName => colName + " = :" + colName )
      let query = `
        UPDATE ${request.params.table} SET ${setQuery}        
        WHERE id = :id `
      let preparedStatement = db.prepare(query)
      request.body.id = request.params.id;
      let result = preparedStatement.run(request.body); 
      response.json(result);
});

webServer.delete('/api/:table/:id', (request,response) => {
    if(!tablesInDb.includes(request.params.table)){    
        return response.json({error: "no such table in the database"});
      }
    
      let query = `
        DELETE FROM 
        ${request.params.table}      
          WHERE id =
           ${request.params.id}`

      let preparedStatement = db.prepare(query)
      let result = preparedStatement.run(request.body);
      response.json(result);

})