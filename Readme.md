This a sample of my work from professional repositories. I've removed sensitive information/proprietary content from te code. The attachment/repository contains two parts.
------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
## Application - Part

The application part is a subsection of part of the micro-service-based application. It is organized in a three-layer convention that follows the controller, service, and model format.

This convention says that only the controller calls should be exposed to other applications. While a Service can interact with other services directly, but it can only interact with the database through its corresponding model. The external interaction with these services can only occur through controllers. Similarly, a model module can interact with only a specific collection or table in a database.

#### For example

Say there are two controllers say A and B, two services A and B corresponding to the controllers, two models A and B  corresponding to these services, and two collections/tables A and B in the database corresponding to these two models. Following are the conditions that apply in this architecture:

* Controller A can only interact with Service A and Controller B can only interact with Service B. These controllers only contain a connection to service APIs that need to be exposed to other micro-services.
* Service A or B can directly interact directly with each other since they are present within the same micro-service, but to interact with services present in other modules of this micro-service-based application,  it can interact with them only through their corresponding controller which contains exposed APIs for external use as mentioned earlier.
* Model A can only perform operations on collection/table A. Similarly, Model B can only operate on collection/table B.
* Model A can only be interacted with by Service A. Similarly, Model B can only be interacted with by Service B.\
Therefore, for Service A to access data stored in collection/table B to perform a certain operation, It needs to interact with Service B which interacts with Model B which in turn interacts with collection/table B and returns the data to Service A to perform its operation.

#### Benefits of this Architecture

* It helps isolate interaction between the code and helps easier debugging and code maintenance. 
* It also makes it modular and adaptive.\
Say, later in the future we change the database, So we only need to rewrite the model code to change the query based on the new database.\
Or Similarly, say there is new default logic added to certain APIs of Service A, it shouldn't affect the following services that used its response for further operation.

## GraphQL/Modelling Sample - Part

It is a small part of complete data modeling that is done using common code for GraphQL schema generation, Database model generation, and other filters and sorting parameters strictly typed in Typescript.

#### Benefits of this method

* It helps utilization of common code which reduces mistakes and errors in the typings of objects, models, and schemas.
* It also makes it modular and adaptive.

------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

> All these services interact with each other using Google Remote Procedure Calls (gRPC) which reduces latency and improves performance in interaction among them. It also makes it easier to find and isolate errors during debugging of a bug. If required I can provide a sample of the definition for gRPC contracts and their typing. \

Recruiters please write to me if you have any further questions or need any explanation about them.
I am reachable at "pateltirth001@gmail.com"

Thank you for your consideration and looking forward to hearing from you soon

Regards,

Tirth S. Patel